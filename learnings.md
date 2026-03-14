# K8s Learning Journal

A record of concepts, tools, and decisions made while learning Kubernetes through a hands-on movies app project.

---

## Pods, Deployments, Services

### Pod
The smallest unit in k8s. A wrapper around one or more containers. Nobody uses raw Pods in practice — if they crash, they stay dead. Used here only to understand the basic structure.

Key fields:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: movies-api
  labels:
    app: movies-api
spec:
  containers:
    - name: movies-api
      image: movies-api:v1
      imagePullPolicy: Never  # use locally loaded image, don't pull from registry
      ports:
        - containerPort: 8080
```

### Deployment
Manages Pods. You declare desired state (replicas: 3), the Deployment controller ensures it forever.
- Pod crashes → immediately replaced
- `kubectl scale deployment movies-api --replicas=5` → scales up
- New image version → rolling update (new pods up, old pods down, zero downtime)

Key fields added on top of Pod spec:
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: movies-api   # must match template labels
  template:             # pod spec goes here
    metadata:
      labels:
        app: movies-api
    spec: ...
```

The `selector.matchLabels` is how the Deployment knows which pods it owns. Pod names get a random suffix: `movies-api-574575c767-bhb9d`.

### Service
Gives a stable DNS name + IP to a group of pods. Pods have unstable IPs (change on every restart). Services don't.
- Frontend calls `http://movies-api:8080` → Service routes to a healthy pod
- Three types: ClusterIP (internal only), NodePort (expose on node), LoadBalancer (external IP)

### Useful commands
```bash
kubectl apply -f file.yaml          # create or update a resource
kubectl get pods                    # list pods
kubectl get deployment              # list deployments
kubectl describe pod <name>         # full detail + events (best debugging tool)
kubectl logs <pod-name>             # container logs
kubectl delete pod <name>           # delete a pod (Deployment recreates it)
kubectl scale deployment <name> --replicas=N
```

---

## Control Plane and Worker Nodes — Deep Dive

### The analogy

Think of a restaurant:
- **Control Plane** = the manager + kitchen management system. Takes orders, decides which chef handles what, tracks what's been made, notices when something goes wrong and corrects it.
- **Worker Nodes** = the chefs. They just execute — cook what they're told, nothing more.

The manager never cooks. The chefs never decide what to cook.

---

### Control Plane components

#### 1. API Server (`kube-apiserver`)
The **single entry point** for everything in the cluster. Every action — from you running `kubectl apply` to internal components talking to each other — goes through the API server. It validates requests and writes state to etcd.

```
kubectl apply -f pod.yaml
      │
      ▼
  API Server  ──► validates ──► writes to etcd
```

Nothing in k8s talks directly to anything else. Everything goes through the API server.

#### 2. etcd
A **distributed key-value store**. The source of truth for the entire cluster. Stores:
- What pods should exist and their specs
- Which nodes are in the cluster
- Current state of every resource

If etcd dies and you have no backup, your cluster config is gone. In production, etcd is replicated across 3 or 5 nodes.

```
etcd holds:
  /registry/pods/default/movies-api-abc123 → { spec, status, ... }
  /registry/nodes/worker-1 → { capacity, conditions, ... }
  /registry/deployments/default/movies-api → { replicas: 3, ... }
```

#### 3. Scheduler (`kube-scheduler`)
Watches for **newly created pods that have no node assigned** and picks the best node for them.

Factors it considers:
- Does the node have enough CPU and memory?
- Does the pod have node affinity rules? (prefer/require certain nodes)
- Does the pod have taints/tolerations? (avoid certain nodes)
- Spread pods evenly across nodes

The scheduler only *decides* — it doesn't start anything. It writes the node assignment back to the API server.

```
New pod created, no node assigned
      │
      ▼
  Scheduler watches → evaluates nodes → picks worker-2 → writes to API server
      │
      ▼
  kubelet on worker-2 sees the assignment → starts the container
```

#### 4. Controller Manager (`kube-controller-manager`)
Runs a collection of **controllers** — each is a control loop watching for drift between desired and actual state.

Key controllers:
| Controller | What it watches |
|---|---|
| Deployment controller | Ensures correct number of ReplicaSets exist |
| ReplicaSet controller | Ensures correct number of Pods exist |
| Node controller | Notices when nodes go down, marks pods as lost |
| Job controller | Tracks Jobs, creates pods, marks Job complete |
| Service Account controller | Creates default service accounts in new namespaces |

Each controller does the same thing in a loop:
```
observe actual state → compare to desired state → if different, act to fix it
```

---

### Worker Node components

#### 1. kubelet
The **agent** running on every worker node. It:
- Watches the API server for pods assigned to its node
- Tells the container runtime to start/stop containers
- Reports pod status back to the API server (running, failed, etc.)
- Runs liveness/readiness probes

The kubelet is the only component that actually starts containers. The scheduler decides *where*, the kubelet decides *how* and does it.

#### 2. kube-proxy
Handles **network rules** on the node. When you create a Service in k8s (a stable endpoint for a set of pods), kube-proxy sets up the iptables/ipvs rules so traffic to that Service IP gets routed to the right pods.

```
Request to movies-api Service IP:8080
      │
  kube-proxy rules on node
      │
      ▼
  Routed to one of: pod-1:8080, pod-2:8080, pod-3:8080
```

#### 3. Container Runtime
The thing that actually runs containers. Typically **containerd** (Docker uses containerd under the hood too). kubelet talks to it via a standard interface (CRI — Container Runtime Interface).

---

### Full flow: you deploy movies-api

```
1. kubectl apply -f movies-api-deployment.yaml
        │
        ▼
2. API Server receives request, validates, writes Deployment to etcd

3. Deployment Controller (in controller-manager) notices new Deployment
   → creates a ReplicaSet

4. ReplicaSet Controller notices ReplicaSet needs 3 pods
   → creates 3 Pod objects in etcd (no node assigned yet)

5. Scheduler notices 3 unscheduled pods
   → evaluates worker nodes → assigns each pod to a node
   → writes node assignment to etcd via API server

6. kubelet on each assigned node notices "I have a new pod"
   → tells containerd to pull image and start container
   → reports back: pod is Running

7. kube-proxy on all nodes updates routing rules
   → traffic to the Service now reaches the new pods
```

---

### In minikube

All of this runs on your single laptop VM. Control plane and worker node are the same machine — but the components and their roles are identical to a production cluster.

---

## What is a Kubernetes Cluster?

### The problem k8s solves

When you run an app in production, you don't run it on one machine. You run it on many — so that if one machine dies, your app keeps running. But managing many machines manually (deploying code, restarting crashed processes, scaling up/down, balancing traffic) is a nightmare. Kubernetes automates all of that.

A **Kubernetes cluster** is the group of machines that Kubernetes manages together as one system.

---

### Anatomy of a cluster

A cluster has two kinds of machines (called **nodes**):

```
┌─────────────────────────────────────────────────────────┐
│                    K8s CLUSTER                          │
│                                                         │
│  ┌──────────────────────┐   ┌────────┐  ┌────────┐     │
│  │   Control Plane      │   │ Worker │  │ Worker │ ... │
│  │  (the brain)         │   │  Node  │  │  Node  │     │
│  │                      │   │        │  │        │     │
│  │  - API Server        │   │ [Pod]  │  │ [Pod]  │     │
│  │  - Scheduler         │   │ [Pod]  │  │ [Pod]  │     │
│  │  - Controller Mgr    │   │        │  │        │     │
│  │  - etcd              │   │        │  │        │     │
│  └──────────────────────┘   └────────┘  └────────┘     │
└─────────────────────────────────────────────────────────┘
```

#### Control Plane — the brain
Runs k8s itself. You never run your app here. It has 4 components:

| Component | What it does |
|---|---|
| **API Server** | The front door — every `kubectl` command hits this |
| **etcd** | The database — stores the entire cluster state (what should exist) |
| **Scheduler** | Decides which worker node a new Pod runs on |
| **Controller Manager** | Watches actual state vs desired state, fixes drift (e.g. restarts crashed pods) |

#### Worker Nodes — where your app runs
Each worker node runs:
- **kubelet** — the agent that talks to the control plane and runs pods on this node
- **kube-proxy** — handles networking/routing between pods
- **container runtime** — actually runs containers (Docker, containerd, etc.)

---

### The core idea: desired state

You tell k8s *what you want* ("3 copies of my movies-api running"), not *how to do it*. k8s figures out how and constantly reconciles reality to match your desired state.

- You write it down → `kubectl apply -f movies-api.yaml`
- k8s stores it in etcd
- Controller Manager watches: actual state ≠ desired state → fix it
- Scheduler picks a node → kubelet starts the container

This loop runs forever. That's the whole system.

---

### In the context of this project

With **minikube**, your laptop runs a single-node cluster where the control plane and worker are on the same machine. That's fine for learning — the concepts are identical.

```
Your Laptop
└── minikube VM
    ├── Control Plane (API server, etcd, scheduler, controller-manager)
    └── Worker Node (kubelet, kube-proxy, your pods)
```

---

## Binary vs Docker Image vs Container

### Binary
A compiled executable. `go build` produces one. Problem: it depends on the machine's environment (OS, libraries, env vars). "Works on my machine" is the failure mode.

### Docker Image
A frozen, self-contained snapshot of your binary + everything it needs to run (OS filesystem, libraries, config). Identical behavior anywhere it runs.

```
Docker Image
├── minimal OS layer (/bin/sh, /lib/libc.so, etc.)
├── /etc/ssl/certs/...   (if app makes HTTPS calls)
└── /app/movies-api      (your Go binary)
```

### Container
A running instance of an image. Image is the blueprint (class), container is the running process (object).

### Relationship
```
go build → binary → docker build (Dockerfile packages it) → image → docker run / k8s → container
```

### Why Go is special here
Go binaries are statically linked — no shared library deps. So the image can be built FROM scratch (literally empty OS):
```dockerfile
FROM scratch
COPY movies-api /
CMD ["/movies-api"]
```
Result: ~10MB image. Most languages need a full OS base image (100-300MB+).

---

## What does Kubernetes actually do to your app?

### Your app without k8s

You have three things:
- `movies-api` — Go binary, `./movies-api` to run it
- `postgres` — run it with `pg_ctl start` or `docker run postgres`
- `frontend` — build and serve it, `./frontend-server`

You SSH into a machine, run these processes, and they're up. Simple.

**The problems start when:**
- The `movies-api` process crashes at 3am → nobody restarts it until morning
- Traffic spikes → you need 5 copies of `movies-api` running → you SSH into 5 machines and start it manually
- You deploy a new version → you stop the old binary, start the new one → downtime
- A machine dies → everything on it is gone → manual recovery
- Frontend needs to talk to backend → you hardcode an IP → that IP changes when you restart the machine

### What k8s does

K8s doesn't change *how* your app runs. Your Go binary still runs as a process. But k8s wraps it in a **container** and then manages everything around it:

| Problem | What k8s does |
|---|---|
| Process crashes | Automatically restarts it |
| Need 5 copies | You declare `replicas: 5`, k8s starts 5 and keeps them alive |
| Deploy new version | Rolling update — starts new pods, drains old ones, zero downtime |
| Machine dies | Reschedules pods onto healthy nodes |
| Services finding each other | Gives every service a stable DNS name (`movies-api.default.svc.cluster.local`) regardless of which machine it's on or what IP it has |
| Config and secrets | Injects them as env vars or files — no hardcoding |
| Traffic distribution | Load balances across all healthy copies automatically |

### The container step

K8s works with **containers**, not raw binaries. So the flow is:

```
Your Go source code
    → docker build → Docker image (your binary + OS deps, frozen snapshot)
        → k8s runs the image as a container (isolated process)
            → k8s wraps containers in a Pod (smallest k8s unit)
                → k8s manages Pods (restart, scale, schedule, network)
```

You never SSH in and run binaries manually. You push an image, tell k8s what you want, and k8s handles the rest.

### Concrete picture for this project

```
                        ┌─── k8s cluster ───────────────────────────┐
                        │                                            │
User → Ingress ────────►│ frontend Pod(s)                           │
                        │      │                                     │
                        │      ▼                                     │
                        │ movies-api Pod(s)  ◄── k8s Service        │
                        │      │               (stable DNS name)     │
                        │      ▼                                     │
                        │ postgres Pod  ◄──── PersistentVolume       │
                        │                    (data survives restarts)│
                        └────────────────────────────────────────────┘
```

K8s manages: how many pods run, where they run, how they find each other, how traffic reaches them, and what happens when anything fails.

---

## Local Kubernetes Tools: minikube vs kind

### What problem do they solve?

Kubernetes is designed to run on clusters of machines. To learn it locally, you need something that **simulates a k8s cluster on your laptop**. Both minikube and kind do this, but differently.

---

### minikube

- Spins up a **single VM (or container)** on your machine that runs a full k8s cluster inside it
- By default, the cluster is **1 control plane node + 0 worker nodes** (all-in-one), but multi-node is supported via `--nodes` flag
- Uses a **driver** to create the VM/container: Docker, VirtualBox, HyperKit (macOS), etc.
- Ships with **addons** — pre-packaged extensions you enable with one command:
  - `minikube addons enable ingress` → sets up NGINX ingress controller
  - `minikube addons enable metrics-server` → enables HPA
  - `minikube addons enable dashboard` → visual UI
- Has `minikube tunnel` — exposes LoadBalancer services to your localhost
- Has `minikube image load` — loads locally built Docker images into the cluster without a registry

**Best for:** Beginners, single-node learning, quick addon setup, when you want convenience over realism.

---

### kind (Kubernetes IN Docker)

- Runs each k8s **node as a Docker container** on your machine
- Designed originally for **testing k8s itself** (used by the k8s project's own CI)
- Multi-node clusters are first-class: define a config file with N control-plane + M worker nodes
- No VM overhead — pure Docker containers, so it starts faster and uses less memory
- No built-in addons — you install everything manually (ingress controller, metrics-server, etc.) via `kubectl apply`
- Image loading: `kind load docker-image <image>` — similar to minikube

**Best for:** Multi-node simulation, CI pipelines, when you want closer-to-prod cluster topology, more control.

---

### Side-by-side comparison

| | minikube | kind |
|---|---|---|
| Runs via | VM or Docker | Docker containers |
| Multi-node | Yes (but secondary) | Yes (first-class) |
| Built-in addons | Yes (`minikube addons enable`) | No (manual installs) |
| LoadBalancer support | `minikube tunnel` | Needs MetalLB or port-forward |
| Startup speed | Slower (VM overhead) | Faster |
| Best use | Learning, convenience | Multi-node, CI, control |
| Local image loading | `minikube image load` | `kind load docker-image` |

---

### Decision for this project

**Using minikube.** Reasons:
- `minikube addons enable ingress/metrics-server` saves setup time so focus stays on k8s concepts
- `minikube tunnel` makes LoadBalancer services just work
- Single-node is sufficient to learn every concept on the list
- Multi-node (for affinity/taints) can be simulated with `minikube start --nodes 3`

---
