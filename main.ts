import get = require('lodash/get')
declare function Viz(graph: string) : string;

function runWithLib(src: string, f: () => void) {
    const script = document.createElement('script')
    script.src = src
    script.onload = f
    document.documentElement.appendChild(script)
}

function findReactComponent(el: Node) {
    for (const key in el) {
        if (key.startsWith('__reactInternalInstance$')) {
            const fiberNode = (el as any)[key]

            return get(fiberNode, 'return.stateNode.constructor.name', null) ||
                get(fiberNode, 'return.type.name', null)
        }
    }
    return null
}

function walkDOM(node: Node, func: (elem: Node) => boolean) {
    let currentNode: Node | null = node
    if (func(currentNode)) {
        currentNode = currentNode.firstChild
        while (currentNode) {
            walkDOM(currentNode, func)
            currentNode = currentNode.nextSibling
        }
    }
}

interface Tree {
    node: string
    children: Tree[]
}

function isHTML(tree: Tree) {
    return tree.node.indexOf('HTML') === 0
}

function collapseHTMLNodes(tree: Tree) {
    let needToPrune = true
    while (needToPrune) {
        needToPrune = false;
        let newChildren: Tree[] = []
        tree.children.forEach(child => {
            if (isHTML(child)) {
                newChildren = newChildren.concat(child.children)
                needToPrune = true
            } else {
                newChildren.push(child)
            }
        })
        tree.children = newChildren
    }

    tree.children.forEach(collapseHTMLNodes)
}

function findAllReactComponents(el: Node) {
    const component = findReactComponent(el)
    if (component) {
        let tree: Tree = {node: component, children: []}

        let node = el.firstChild
        while (node) {
            let childComponent = findAllReactComponents(node)
            if (childComponent) {
                tree.children.push(childComponent)
            }
            node = node.nextSibling
        }

        return tree
    }

    return null
}

let names: { [x: string]: string | undefined } = {}

function getName(name: string) {
    if (name in names) {
        return names[name]
    } else {
        return names[name] = Object.keys(names).length.toString(16)
    }
}

function generateForTree(tree: Tree) {
    let output: string[] = []
    let name = getName(tree.node)

    output.push(name + ' [label="' + tree.node + '"]')
    for (let child of tree.children) {
        output.push(name + ' -> ' + getName(child.node))
        output = output.concat(generateForTree(child))
    }
    return output
}

function generateGraph() {
    walkDOM(document.body, node => {
        let components = findAllReactComponents(node)
        if (components) {
            collapseHTMLNodes(components)
            let lines = new Set(generateForTree(components))
            let output: string[] = []
            output.push('digraph {')
            lines.forEach(line => {
                output.push(line + ';')
            })
            output.push('}')
            console.log(output.join('\n'))

            let svgContent = Viz(output.join(''))
            document.body.innerHTML = svgContent

            return false
        } else {
            console.log('didnt find any components')
        }
        return true
    })
}

runWithLib('https://unpkg.com/viz.js@1.8.1/viz.js', () => {
    generateGraph()
})

