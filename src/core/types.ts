export interface Tree {
    ifTrue: Tree | null,
    ifFalse: Tree | null,
    split: Array<any>
}