// Real, GitHub-verified merged pull requests, grouped by project.
// `highlight: true` entries also show in the homepage "Recent contributions" strip.

export interface Contribution {
  title: string;
  href: string;
  mergedAt: string; // ISO date
  highlight?: boolean;
}

export interface ContributionProject {
  name: string;
  description: string;
  href: string;
  items: Contribution[];
}

export const contributionProjects: ContributionProject[] = [
  {
    name: "OpenEverest",
    description:
      "Kubernetes-native database provisioning platform (CNCF Sandbox).",
    href: "https://github.com/openeverest",
    items: [
      {
        title: "Fixed a dead go mod tidy check in CI",
        href: "https://github.com/openeverest/openeverest/pull/2962",
        mergedAt: "2026-08-18",
      },
      {
        title:
          "Fixed the Postgres provider to watch Instances across all namespaces",
        href: "https://github.com/openeverest/provider-percona-postgresql/pull/21",
        mergedAt: "2026-08-14",
        highlight: true,
      },
      {
        title:
          'Wrote "High Availability PostgreSQL: From Zero to Cluster" for the project blog',
        href: "https://github.com/openeverest/openeverest.github.io/pull/120",
        mergedAt: "2026-08-20",
      },
      {
        title: "Fixed Helm chart version drift and step order in the release workflow",
        href: "https://github.com/openeverest/helm-charts/pull/82",
        mergedAt: "2026-08-29",
      },
      {
        title: "Exposed httpProxy/httpsProxy/noProxy for Helm chart hook Jobs",
        href: "https://github.com/openeverest/helm-charts/pull/77",
        mergedAt: "2026-08-28",
      },
      {
        title:
          "Added a unit-test job and gated chainsaw integration tests to the ClickHouse provider CI",
        href: "https://github.com/openeverest/provider-altinity-clickhouse/pull/21",
        mergedAt: "2026-08-24",
      },
    ],
  },
  {
    name: "KubeStellar",
    description:
      "Multi-cluster Kubernetes configuration management (CNCF Sandbox).",
    href: "https://github.com/kubestellar",
    items: [
      {
        title: "Generalized E2E tests to run against released KubeFlex artifacts",
        href: "https://github.com/kubestellar/kubeflex/pull/594",
        mergedAt: "2026-01-05",
        highlight: true,
      },
      {
        title:
          "Advanced kubestellar/kubestellar to Kubernetes 1.32.13, KubeFlex v0.9.3, and ocm-addon v0.2.0-rc17",
        href: "https://github.com/kubestellar/kubestellar/pull/3726",
        mergedAt: "2026-04-28",
      },
      {
        title: "Removed a stray .helmignore breaking chart packaging",
        href: "https://github.com/kubestellar/kubestellar/pull/3562",
        mergedAt: "2026-01-12",
      },
      {
        title: "Fixed .gitignore hiding the cmd/console Go source directory",
        href: "https://github.com/kubestellar/console/pull/1011",
        mergedAt: "2026-02-16",
      },
      {
        title: "Added a KillerCoda scenario: BindingPolicy in Action",
        href: "https://github.com/kubestellar/kubestellar-killercoda/pull/11",
        mergedAt: "2026-01-09",
      },
      {
        title: "Added a KillerCoda scenario: Multi-WEC / Realistic Topology",
        href: "https://github.com/kubestellar/kubestellar-killercoda/pull/10",
        mergedAt: "2026-01-09",
      },
      {
        title: "Added a KillerCoda CI workflow",
        href: "https://github.com/kubestellar/kubestellar-killercoda/pull/6",
        mergedAt: "2026-01-09",
      },
      {
        title: "Added a simple KillerCoda scenario workflow",
        href: "https://github.com/kubestellar/kubestellar-killercoda/pull/4",
        mergedAt: "2026-01-07",
      },
      {
        title: "Updated .gitignore to block compiled binaries",
        href: "https://github.com/kubestellar/kubestellar/pull/3251",
        mergedAt: "2025-08-19",
      },
      {
        title:
          "Added .gitattributes to normalize line endings and exclude generated files from diffs",
        href: "https://github.com/kubestellar/kubestellar/pull/3241",
        mergedAt: "2025-08-15",
      },
      {
        title: "Added a release note to README.md",
        href: "https://github.com/kubestellar/kubestellar/pull/3232",
        mergedAt: "2025-08-15",
      },
      {
        title: "Documented the issue archive process in CONTRIBUTING.md",
        href: "https://github.com/kubestellar/kubestellar/pull/3231",
        mergedAt: "2025-08-15",
      },
    ],
  },
  {
    name: "Open Cluster Management",
    description: "Multi-cluster Kubernetes management (CNCF project).",
    href: "https://open-cluster-management.io/",
    items: [
      {
        title: "Added TLS profile configuration support for spoke cluster agents",
        href: "https://github.com/open-cluster-management-io/ocm/pull/1486",
        mergedAt: "2026-05-19",
        highlight: true,
      },
    ],
  },
  {
    name: "kro",
    description: "Kubernetes Resource Orchestrator (Kubernetes SIGs).",
    href: "https://github.com/kubernetes-sigs/kro",
    items: [
      {
        title:
          "KREP-008: design proposal for resource-backed includeWhen evaluation",
        href: "https://github.com/kubernetes-sigs/kro/pull/933",
        mergedAt: "2026-03-11",
        highlight: true,
      },
    ],
  },
];

export type HighlightedContribution = Contribution & { project: string };

export const highlightedContributions: HighlightedContribution[] =
  contributionProjects
    .flatMap(project =>
      project.items.map(item => ({ ...item, project: project.name }))
    )
    .filter(item => item.highlight)
    .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt));
