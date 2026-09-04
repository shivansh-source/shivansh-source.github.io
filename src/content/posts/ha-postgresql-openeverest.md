---
title: "High Availability PostgreSQL: From Zero to Cluster"
description: "A walkthrough of deploying a three-node PostgreSQL cluster on Kubernetes with OpenEverest v2 and the Percona provider, then chaos-testing failover by killing the primary pod and its volume. Originally published on the OpenEverest blog."
pubDatetime: 2026-08-20T00:00:00Z
draft: false
tags:
  - postgresql
  - kubernetes
  - openeverest
  - cncf
  - high-availability
canonicalURL: https://openeverest.io/blog/ha-postgresql-openeverest/
---

I wrote a piece on the OpenEverest blog covering how to run high-availability PostgreSQL on Kubernetes using OpenEverest's provider model.

It walks through deploying a three-node cluster with the Percona provider, verifying replication state across nodes, then two chaos tests: killing just the primary pod (which restarts on the same storage), and killing the pod, its persistent volume, and cordoning its node to force a genuine replica promotion — Patroni elects a new leader in about 1.4 seconds with zero data loss and updates endpoints automatically.

**Read the full post on OpenEverest:** [High Availability PostgreSQL: From Zero to Cluster](https://openeverest.io/blog/ha-postgresql-openeverest/)

Written as part of my ongoing contribution work to OpenEverest (CNCF Sandbox), where I've also opened [a PR adding clickhouse-backup based backup/restore support](https://github.com/openeverest/provider-altinity-clickhouse/pull/22) for the ClickHouse provider — currently open for review.
