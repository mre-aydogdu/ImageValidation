// RANOREX
var RX = {};
window.RX = RX;

RX.init = function () {
    RX.globId = Math.floor((Math.random() * 1000000) + 1);
    RX.idToNode = [];
	
	var observer = new MutationObserver(mutations => {
        mutations.forEach(({ removedNodes }) => {
            removedNodes.forEach(node => {
                if(node.nodeType === 1 && node.$RXid) {
                    delete RX.idToNode[node.$RXid];
                    delete node.$RXid;
					console.log("Remove node id " + node.$RXid);
                }
            })
        })
    })
	
	window.onload = function() {
        var config = {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        };
        //note this observe method call
        observer.observe(window.document, config);
        console.log("Observer is registered");
    };
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
