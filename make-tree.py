python - << 'EOF'
tree = {}

with open("_files.txt", encoding="utf-8") as f:
    for line in f:
        parts = line.strip().split("/")
        node = tree
        for p in parts:
            node = node.setdefault(p, {})

def show(node, prefix=""):
    keys = sorted(node.keys())
    for i, k in enumerate(keys):
        last = i == len(keys) - 1
        out.write(prefix + ("└── " if last else "├── ") + k + "\n")
        show(node[k], prefix + ("    " if last else "│   "))

with open("project-structure.txt", "w", encoding="utf-8") as out:
    show(tree)
EOF
