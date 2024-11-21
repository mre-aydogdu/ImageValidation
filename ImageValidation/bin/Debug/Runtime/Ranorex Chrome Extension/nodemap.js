// RANOREX
var RX = {};
window.RX = RX;

RX.init = function () {
    RX.globId = Math.floor((Math.random() * 1000000) + 1);
    RX.idToNode = [];
    window.addEventListener('DOMNodeRemovedFromDocument', function (evt) {
        var n = evt.target;
        if (n.nodeType == 1 && n.$RXid) {
            delete RX.idToNode[n.$RXid];
            delete n.$RXid;
        }
    }, true);
}

RX.node = function (id) {
    return RX.idToNode[id];
}

RX.id = function (node) {
    if (!node)
        return null;
    if (!node.$RXid) {
        RX.globId++;
        node.$RXid = RX.globId;
        RX.idToNode[node.$RXid] = node;
    }
    return node.$RXid;
}
