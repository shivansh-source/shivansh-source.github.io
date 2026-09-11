---
title: "Hardening a Kubernetes workload, one attack at a time"
description: "Four attack paths out of one compromised container, proved in a local k3d cluster, closed one control at a time — then what each attack looks like in the API audit log, with two detections written against it."
pubDatetime: 2026-09-11T18:30:00Z
draft: false
tags:
  - kubernetes
  - security
  - rbac
  - detection
---

This is a local lab. Everything runs in k3d (k3s in Docker), no cloud spend. I stand up a deliberately vulnerable nginx workload, prove four attack paths against it with real terminal output, fix each one and re-run the attack, then show how the same moves look in the API audit log so you can alert on them.

The transcripts are the point. Every block below is copied from the cluster. All of it — manifests, audit policy, and the detection write-ups — is in [k8s-hardening-lab](https://github.com/shivansh-source/k8s-hardening-lab).

## Threat model

One assumption: an attacker gets code execution in a single application container. Maybe an RCE in the app, maybe a poisoned dependency. The container is not the prize. The question is what that foothold reaches. On a default setup the answer is "most of the namespace and the API server," and I want to close that down to "almost nothing" while the app keeps working.

## The cluster, with audit logging on from the start

Audit logging is the fiddly part on k3s, so wire it in at creation. The policy keeps volume down: full request/response on `pods/exec` and friends, metadata on secrets, tokens and RBAC changes, and `None` for everything else.

```bash
k3d cluster create sec-lab \
  --volume "$(pwd)/audit-policy.yaml:/var/lib/rancher/k3s/server/audit-policy.yaml@server:0" \
  --k3s-arg "--kube-apiserver-arg=--audit-policy-file=/var/lib/rancher/k3s/server/audit-policy.yaml@server:0" \
  --k3s-arg "--kube-apiserver-arg=--audit-log-path=/var/log/kubernetes/audit.log@server:0"
```

Read it with `docker exec k3d-sec-lab-server-0 cat /var/log/kubernetes/audit.log | jq`. If the file never appears, the apiserver rejected a flag, so check `docker logs k3d-sec-lab-server-0`. k3s ships kube-router, so NetworkPolicy actually enforces here. Do not pass `--disable-network-policy`.

## Baseline: four attack paths

The baseline is nginx running as root, on the default ServiceAccount, with its token mounted, and that default SA bound to the cluster `edit` role. There is a second workload, `internal-api`, as a lateral target. Exec in and go to work.

**Root, and a mounted token that can read every secret:**

```
$ id
uid=0(root) gid=0(root) groups=0(root)

$ curl -sk -H "Authorization: Bearer $TOKEN" https://kubernetes.default.svc/api/v1/namespaces/app/secrets
{ "kind": "SecretList", ... "items": [ { "metadata": { "name": "db-credentials", ...
```

**What that token can do (`kubectl auth can-i --list` from inside the pod):**

```
Resources               Verbs
pods                    [create delete deletecollection patch update get list watch]
deployments.apps        [create delete deletecollection patch update get list watch]
secrets                 ... (full edit across the namespace)
serviceaccounts/token   [create]
```

**Lateral movement, because a flat pod network has no default deny:**

```
$ wget -qO- http://internal-api.app.svc.cluster.local
internal-api: you reached the lateral-movement target
```

**Arbitrary egress:**

```
$ egress example.com -> reachable
```

The cloud metadata endpoint (`169.254.169.254`) just hangs locally — there is no metadata service in k3d, so I am not going to fake a result. What matters is that egress is wide open. On EKS this same open egress is the path to the node IAM role, which is why IRSA and a metadata-blocking egress rule both matter. The egress block is below.

## The fixes

One change per commit. Re-run the matching attack each time.

### 01. Stop mounting the token

`automountServiceAccountToken: false`. The app never calls the API, so it has no business carrying a credential.

```
$ cat /var/run/secrets/kubernetes.io/serviceaccount/token
cat: .../token: No such file or directory
```

### 02. Pod Security Standards: restricted

Label the namespace `pod-security.kubernetes.io/enforce: restricted`, then try to schedule the old root pod. Admission rejects it verbatim:

```
Error from server (Forbidden): pods "rooted" is forbidden: violates PodSecurity
"restricted:latest": allowPrivilegeEscalation != false ..., unrestricted
capabilities ..., runAsNonRoot != true ..., seccompProfile ...
```

Add the `securityContext` that satisfies it: `runAsNonRoot`, `runAsUser: 1000`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `capabilities.drop: ["ALL"]`. A non-root user cannot bind port 80, so this uses the unprivileged nginx image on 8080, with emptyDir mounts for the paths nginx writes to. Now it is non-root, the root filesystem is read-only, and it still serves:

```
$ id
uid=1000 gid=0(root) groups=0(root),1000

$ touch /etc/nginx/x
touch: /etc/nginx/x: Read-only file system

$ wget -qO- http://127.0.0.1:8080
<title>Welcome to nginx!</title>
```

### 03. Default-deny network, then the minimum

A default-deny NetworkPolicy on both directions, then DNS to kube-system and `web -> internal-api` on its port. Watch it break, then come back scoped:

```
# after default-deny, before allows
$ wget internal-api  -> wget: bad address (blocked)

# after allow-dns + web->internal-api
$ wget internal-api  -> internal-api: you reached the lateral-movement target
$ egress example.com -> BLOCKED (exit 1)
```

The lateral hop the attacker wanted still works, because the app needs it — but egress to the internet is gone. For workloads that genuinely need broad egress, the policy also carries the metadata carve-out: allow `0.0.0.0/0` `except 169.254.169.254/32`. Be honest about the trade-off, though: that rule reopens general egress, so prefer real CIDRs when you can. On EKS the carve-out is what stops a compromised pod from reaching the node role.

### 04. RBAC down to what the app reads

Delete the `edit` binding, replace it with a Role granting `get`/`list` on the one ConfigMap the app uses. Re-run `can-i --list` and diff against the baseline:

```
$ kubectl auth can-i --list --as=system:serviceaccount:app:default -n app
Resources    Resource Names   Verbs
configmaps   [app-config]     [get list]

can-i list secrets  -> no
can-i create deploy -> no
```

The wall of `edit` verbs is gone. All that is left is read on a single named ConfigMap.

## Detection

Fixes fail. You still want to see the attack. This is the part that makes it a security exercise rather than a config tutorial: turn on audit logging, run the same attacks against the hardened cluster, and write rules against what actually lands in the log.

### Detection 1: exec into a pod

An interactive shell in a running container is one of the loudest signals in the API audit log. It shows up as an access to the `pods/exec` subresource. This is the entry the lab produced running `kubectl exec -n app deploy/web -- id`:

```json
{
  "kind": "Event",
  "level": "RequestResponse",
  "stage": "ResponseComplete",
  "requestURI": "/api/v1/namespaces/app/pods/web-7b4b9cc658-584z7/exec?command=id&container=nginx&stderr=true&stdout=true",
  "verb": "get",
  "user": {
    "username": "system:admin",
    "groups": ["system:masters", "system:authenticated"]
  },
  "sourceIPs": ["172.18.0.3"],
  "userAgent": "kubectl/v1.35.2 (linux/amd64) kubernetes/fdc9d74",
  "objectRef": {
    "resource": "pods",
    "namespace": "app",
    "name": "web-7b4b9cc658-584z7",
    "subresource": "exec"
  },
  "responseStatus": { "code": 101 },
  "annotations": { "authorization.k8s.io/decision": "allow" }
}
```

The rule is one line:

- `objectRef.resource == "pods"` **and** `objectRef.subresource == "exec"`

That is the whole signal. Enrich, don't gate, on the rest: `user.username` is the actor — alert when it is a ServiceAccount (`system:serviceaccount:*`) or any identity outside your named break-glass and CI accounts. A human on a bastion is expected; a workload SA calling exec is not. `objectRef.namespace` / `objectRef.name` tell you what was entered, and `requestURI` carries the command (`?command=id&container=nginx`). Log it.

**One gotcha worth the whole exercise:** do not key the rule on the verb. On this cluster (k8s 1.31+) `kubectl exec` uses the websocket transport, so the audit verb is **`get`** and the response code is `101` (switching protocols). Older SPDY clients show up as verb `create`. If your rule says `verb == "create"` you will silently miss every modern client. Match the `exec` subresource and accept either verb.

`pods/attach` and `pods/portforward` are the same class of access and are captured by the same audit policy. Treat them together.

For tuning, the real source of noise is engineers debugging in production. Two ways to keep the signal: allowlist the identities that are supposed to exec — named humans going through a break-glass role, and nothing else — and weight by target, since an exec into a batch job or a `kube-system` pod is more interesting than one into a dev namespace, and a `command` of `sh`/`bash` is more interesting than a scripted one-shot.

The clean fix is to make exec rare on purpose: remove standing exec rights, route debugging through short-lived break-glass grants, and then every exec not tied to an open break-glass request is worth a page.

### Detection 2: secret enumeration from a pod ServiceAccount

Token theft looks boring in the audit log: it is just a `list` on `secrets`. What makes it a finding is *who* is asking. A pod-bound ServiceAccount pulling the secret list is the exact tail end of the token-theft path from the baseline. This is the line that attack produced:

```json
{
  "kind": "Event",
  "level": "Metadata",
  "stage": "ResponseComplete",
  "requestURI": "/api/v1/namespaces/app/secrets",
  "verb": "list",
  "user": {
    "username": "system:serviceaccount:app:default",
    "groups": [
      "system:serviceaccounts",
      "system:serviceaccounts:app",
      "system:authenticated"
    ],
    "extra": {
      "authentication.kubernetes.io/pod-name": ["web-7fc7749b56-9jtnl"]
    }
  },
  "sourceIPs": ["10.42.0.10"],
  "userAgent": "curl/7.88.1",
  "objectRef": { "resource": "secrets", "namespace": "app" },
  "responseStatus": { "code": 200 },
  "annotations": {
    "authorization.k8s.io/decision": "allow",
    "authorization.k8s.io/reason": "RBAC: allowed by RoleBinding \"too-much/app\" of ClusterRole \"edit\" to ServiceAccount \"default/app\""
  }
}
```

Everything you need is in that one record: the actor (`system:serviceaccount:app:default`), the exact pod it came from (`authentication.kubernetes.io/pod-name`), the client (`userAgent: curl/7.88.1`, which is not a client-go user agent), the pod IP, and even the binding that let it through (`RoleBinding "too-much" ... ClusterRole "edit"`).

The rule, in plain terms — fire when, inside a short window (say 60 seconds):

- `objectRef.resource == "secrets"` **and** `verb in ("list", "get", "watch")`
- **and** `user.username` starts with `system:serviceaccount:`
- **and** the count from one SA crosses a small threshold (a burst, e.g. 3+)

A single `get` on a named secret a workload owns is normal. A `list` of all secrets in a namespace, or a rapid series of `get`s across many names, from a ServiceAccount is not something a well-behaved app does.

Two signals worth raising severity on. First, `userAgent` is `curl`, `python-requests`, `Go-http-client`, or empty, rather than a real `kubectl`/client-go agent — apps that legitimately read a secret use the SDK, not curl. Second, the SA is `default`, and a workload should never run as the namespace default SA.

Controllers and operators list secrets constantly and legitimately (cert-manager, ingress controllers, the kubelet), so tune by allowlisting known infra ServiceAccounts (`kube-system:*`, your operators) and scoping the rule to application namespaces — and alert on `list`/`watch` over all secrets separately from `get` on a single named secret. The first is enumeration; the second is usually normal use.

The audit reason field closes the loop: it names the RoleBinding that granted access, so a hit tells you both that enumeration happened and which over-broad grant to go delete.

## What this does not cover

PSS is admission-time only. It checks the spec when the pod is created and then steps out of the way, so it does nothing about a container that escapes after start. That is runtime, and it wants a runtime tool (Falco or similar), which this lab leaves as optional.

Also out of scope: supply-chain (a malicious image passes every control here cleanly), runtime evasion, node and control-plane hardening, and secrets management beyond "do not hand them to every pod."

The four fixes shrink the blast radius of one compromised container. They do not stop it from being compromised.
