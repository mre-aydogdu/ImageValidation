// RANOREX content script

//console.log("Ranorex: begin tab init");

var rxFrameId = -1;

RX.init();
RXmsg.createBgPort();

// handlers for everything handled by the tab

RXmsg.addHandler("getDocumentChildren", function (m, r) {
    try {
        var children = [];
        var docChildren = document.documentElement.childNodes;
        for (var i = 0; i < docChildren.length; i++) {
            var c = docChildren[i];
            if (c.nodeType === 1)
                children.push(RX.id(c));
        }
        r({ children: children });
    }
    catch (e) {
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});

RXmsg.addHandler("getElementChildren", function (m, r) {
    try {
        var children = [];
        var node = RX.node(m.arg0);
        if (!node) {
            r({ children: [] });
            return;
        }
        var elemChildren = node.childNodes;
        for (var i = 0; i < elemChildren.length; i++) {
            var c = elemChildren[i];
            if (c.nodeType === 1)
                children.push({ id: RX.id(c), tag: c.tagName, shadowRoot: !!c.shadowRoot });
        }

        if (node.shadowRoot) {
            var shadowChildren = node.shadowRoot.childNodes;
            for (var i = 0; i < shadowChildren.length; i++) {
                var c = shadowChildren[i];
                if (c.nodeType === 1)
                    children.push({ id: RX.id(c), tag: c.tagName, shadowRoot: !!c.shadowRoot });
            }
        }
        r({ children: children });
    }
    catch (e) {
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});

var frameCallbackMap = {};

RXmsg.addHandler("getFrameElementFrameId", function (m, r) {
    try {
        var frameElem = RX.node(m.arg0);

        if (!frameElem) {
            r({ frameid: -1 });
            return;
        }

        try {
            r({ frameid: frameElem.contentWindow.rxFrameId || -2 });
            return;
        } catch (e) {
            //post to content script of inner frame (see: content.js receiveMessage)
            frameElem.contentWindow.postMessage({ msg: "rx-getframeid-request", id: m.arg0, parentFrameId: rxFrameId }, "*");
        }

        frameCallbackMap[m.arg0] = r;
    }
    catch (e) {
        console.error(e);
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});

// List<NpPtr> GetFrameElementChildren(NpPtr elemId);List<NpPtr> GetFrameElementChildren(NpPtr elemId);
RXmsg.addHandler("getFrameElementChildren", function (m, r) {
    try {
        var children = [];
        var frameElem = RX.node(m.arg0);

        if (!frameElem) {
            r({ children: [] });
            return;
        }

        var doc;
        try {
            doc = frameElem.contentDocument;
        }
        catch (csse) {
            console.warn("Ranorex: cross-domain frame acccess failed: " + csse);
            r({ children: [] });
            return;
        }

        if (doc.readyState !== "interactive" &&
            doc.readyState !== "complete") {
            r({ children: [] });
            return;
        }

        var docChildren = doc.documentElement.childNodes;
        for (var i = 0; i < docChildren.length; i++) {
            var c = docChildren[i];
            if (c.nodeType === 1)
                children.push(RX.id(c));
        }
        r({ children: children });
    }
    catch (e) {
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});


//  string GetElementValue(NpPtr elemId, string name);
RXmsg.addHandler("getElementValue", function (m, r) {
    try {
        var name = m.arg1;
        var value;

        if (name === "#FRAMEOUTERHTML") {
            value = document.documentElement.outerHTML;
            r({ value: value });
            return;
        }

        var node = RX.node(m.arg0);

        if (!node) {
            r({ value: null });
            return;
        }

        if (name.indexOf("#") === 0) {
            if (name == "#VALID") {
                if (!node.ownerDocument.contains(node) && !node.getRootNode())
                    value = "#nocontain";
                else value = "valid";
            }
            else if (name === "#RECT") {
                var rect = node.getBoundingClientRect();

                var x = rect.left; var y = rect.top;
                var w = rect.right - x; var h = rect.bottom - y;

                if (x == 0 && y == 0 && w == 0 && h == 0) {
                    var rs = node.getClientRects();
                    if (rs.length > 0) {
                        x = rs[0].left; y = rs[0].top;
                        w = rs[0].right - x; h = rs[0].bottom - y;
                    }
                }
                value = Math.round(x) + "," + Math.round(y) + "," + Math.round(w) + "," + Math.round(h);
            }
            else if (name === "#ENSUREVISIBLE") {
                node.scrollIntoViewIfNeeded();
            }
            else if (name === "#FOCUS") {
                node.focus();
            }
            else if (name === "#HASFOCUS") {
                if (!node.ownerDocument || !node.ownerDocument.activeElement)
                    value = "false";
                else value = node.isEqualNode(node.ownerDocument.activeElement) ? "true" : "false";
            }
            else if (name === "#INNERTEXT") {
                var elemChildren = node.childNodes;
                var innerText = "";

                for (var i = 0; i < elemChildren.length; i++) {
                    var c = elemChildren[i];
                    if (c.nodeType == 3) {
                        var txt = c.nodeValue;
                        if (txt) {
                            var trimText = txt.trim();
                            if (trimText.length > 0)
                                innerText += txt;
                        }
                    }
                }
                value = innerText;
            }
            else if (name === "#DOCUMENTHTML") {
                if (node.ownerDocument) {
                    value = node.ownerDocument.documentElement.outerHTML;
                }
            }
            else if (name === "#EXPANDO") {
                var expando = [];
                var attr = node.attributes;
                for (let i = 0; i < attr.length; i++) {
                    var att = attr[i];
                    expando.push(att.nodeName);
                }
                value = expando.join(";");
            }
        }
        else {
            if (name === "tagName")
                value = node.tagName;
            else if (name == "style")
                value = "" + node.getAttribute("style");
            else {

                var jsAttr = node[name];
                if (jsAttr != null && ("" + jsAttr) != "" && typeof (jsAttr) != "object")
                    value = jsAttr;
                else if (node.hasAttribute(name))
                    value = node.getAttribute(name);
                else value = null;

                if (typeof (value) === "boolean")
                    value = value ? "True" : "False";
                else if (value != null)
                    value = "" + value;
                else value = null;
            }
        }
        r({ value: value });
    }
    catch (e) {
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});

// void SetElementValue(int wndId, int tabId, NpPtr elemId, string name, string value);
RXmsg.addHandler("setElementValue", function (m, r) {
    try {
        var node = RX.node(m.arg0);
        var name = m.arg1;
        var value = m.arg2;
        //node.setAttribute(name, value);
        node[name] = value;
        r({});
    }
    catch (e) {
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});

// List<NpPtr> GetElementFromPoint(int wndId, int tabId, NpPtr frameElemId, int x, int y);
RXmsg.addHandler("getElementFromPoint", function (m, r) {
    try {
        var lineage = [];
        var document;

        try {
            if (m.arg0 > 0)
                document = RX.node(m.arg0).contentDocument;
            else document = window.document;
        }
        catch (csse) {
            console.warn("Ranorex: cross-domain frame acccess failed: " + csse);
            r({ lineage: null });
            return;
        }

        var prevElem;
        var foundElem = document.elementFromPoint(m.arg1, m.arg2);
        while (foundElem && foundElem.shadowRoot && foundElem != prevElem) {
            prevElem = foundElem;
            foundElem = foundElem.shadowRoot.elementFromPoint(m.arg1, m.arg2);
        }
        if (!foundElem) {
            r({ lineage: null });
            return;
        }

        lineage.push(RX.id(foundElem));
        var parent = foundElem;

        while (true) {
            parent = parent.parentNode;
            if (!parent.tagName && parent.host) {
                parent = parent.host;
            }
            if (!parent || !parent.tagName || parent.tagName.toLowerCase() === "html")
                break;
            lineage.push(RX.id(parent));
            var tag = parent.tagName.toLowerCase();
            if (tag === "body" || tag === "head")
                break;
        }
        lineage.reverse();
        r({ lineage: lineage });
    }
    catch (e) {
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});

// List<NpPtr> GetElementFromUid(int wndId, int tabId, NpPtr frameElemId, string uidValue);
RXmsg.addHandler("getElementFromUid", function (m, r) {
    try {
        var lineage = [];
        var document;
        if (m.arg0 > 0) {
            var parentFrame = RX.node(m.arg0);
            if (parentFrame) {
                try {
                    document = parentFrame.contentDocument;
                }
                catch (csse) {
                    console.warn("Ranorex: cross-domain frame acccess failed: " + csse);
                }
            }
        }
        else document = window.document;

        if (!document) {
            r({ lineage: null });
            return;
        }

        if (document.readyState !== "interactive" &&
            document.readyState !== "complete") {
            r({ lineage: null });
            return;
        }

        var foundElem = document.getElementById(m.arg1);
        if (!foundElem) {
            r({ lineage: null });
            return;
        }

        lineage.push(RX.id(foundElem));
        var parent = foundElem;

        while (true) {
            parent = parent.parentNode;
            lineage.push(RX.id(parent));

            if (!parent || !parent.tagName || parent.tagName.toLowerCase() === "html")
                break;
        }
        lineage.reverse();
        r({ lineage: lineage });
    }
    catch (e) {
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});

RXmsg.addHandler("getElementFromPath", function (m, r) {
    try {
        var document;
        if (m.arg0 > 0) {
            var parentFrame = RX.node(m.arg0);
            if (parentFrame) {
                try {
                    document = parentFrame.contentDocument;
                }
                catch (csse) {
                    console.warn("Ranorex: cross-domain frame acccess failed: " + csse);
                }
            }
        }
        else document = window.document;

        if (!document) {
            r({ lineage: null });
            return;
        }

        if (document.readyState !== "interactive" &&
            document.readyState !== "complete") {
            r({ lineage: null });
            return;
        }

        var result = { lineages: [], dangling: [] };

        var dangle = [];
        var foundElems = document._rx_find(m.arg1, document.documentElement, m.arg2, dangle);
        result.dangling = dangle.map(d => RX.id(d));

        foundElems.forEach(e => {
            result.lineages.push(elemToLineage(e));
        });

        r(result);
    }
    catch (e) {
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});

function elemToLineage(elem) {
    var lineage = [];
    lineage.push(RX.id(elem));
    var parent = elem;
    while (true) {
        parent = parent.parentNode;
        lineage.push(RX.id(parent));
        if (!parent || !parent.tagName || parent.tagName.toLowerCase() == "html")
            break;
    }
    lineage.reverse();
    return lineage;
}

// string GetElementStyle(int wndId, int tabId, NpPtr elemId, string name);
RXmsg.addHandler("getElementStyle", function (m, r) {
    try {
        var node = RX.node(m.arg0);
        var name = m.arg1;
        var value;

        //console.log("getElementStyle: " + m.arg0 + " node: " + node + " name: " + name);
        if (name == "#ZOOM") {
            value = "" + window.innerWidth;
            r({ value: value });
            return;
        }

        var sty = window.getComputedStyle(node);
        value = sty[name];
        r({ value: value });
    }
    catch (e) {
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});

// bool SetElementStyle(int wndId, int tabId, NpPtr elemId, string name, string value);
RXmsg.addHandler("setElementStyle", function (m, r) {
    try {
        var node = RX.node(m.arg0);
        var name = m.arg1;
        var value = m.arg2;
        node.style[name] = value;
        r({});
    }
    catch (e) {
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});

//V3 Support : Move /copy the entire javascript code executed within C#/Ranorex to google chrome extension
function getAllDynamicIds(r) {
    try {
        console.log("Hitting getAllIds");
        try {
            var ids = [], all = document.all;
            for (var n = 0; n < all.length; n++) {
                console.log("Hitting for loop inside getAllDynamicIds");
                var e = all[n];
                if (typeof (e.getAttribute("id")) === "string") {
                    var val = e.getAttribute("id").trim();
                    if (val.length > 0) {
                        ids.push(val);
                        //console.log("value pushed inside getAllDynamicIds");
                    }
                }
            }
            ids = ids.sort().join('\t');
            //console.log("ids is ", ids);
            r({ result: ids });//list of sorted ids returned to ranorex
        }
        catch (e) {
            console.log("Ranorex: Failed to get dynamic ids: " + e);
            r({ err: 'Error ' + e.stack });
        }

    }
    catch (e) {
        r({ err: 'Error ' + e });
    }
}
// string ExecuteScript(int wndId, int tabId, NpPtr elemId, string code);
RXmsg.addHandler("executeScript", function (m, r) {
    console.log("executescript is hit", m);
    try {
        if (m.arg1 != null && m.arg1 == "getallids") {
            //console.log("getAllDynamicIds is hit");
            getAllDynamicIds(r);
        }
        else if (m.arg1 != null && m.arg1 == "raiseEvent") {
            raiseEvent(m.arg2[0], m.arg2[1], m.arg2[2], r);
        }
        else {
            //console.log("Change me", m);
            //debugger;
            var targetWnd;
            if (m.arg0 > 0)
                targetWnd = RX.node(m.arg0).contentWindow;
            else targetWnd = window;

            var targetDoc = targetWnd.document;
            var script = targetDoc.createElement('script');
            targetWnd._rxresult = undefined;
            targetWnd._rxcomplete = false;
            targetWnd._rxtimeout = 100;
            script.textContent = 'var result = undefined; try{ result = ' + m.arg1 + ';}catch(e){}; document.documentElement.setAttribute("rxresult", result); document.documentElement.setAttribute("rxcomplete", "true");';
            (targetDoc.head || targetDoc.documentElement).appendChild(script);
            script.parentNode.removeChild(script);

            var cb = function (wnd) {
                if (wnd.document.documentElement.getAttribute("rxcomplete") !== "true" && wnd._rxtimeout > 0) {
                    wnd._rxtimeout = wnd._rxtimeout - 1;
                    setTimeout(cb, 1, wnd);
                }
                else {
                    let resultStr = wnd.document.documentElement.getAttribute("rxresult") + "";

                    wnd.document.documentElement.removeAttribute("rxresult");
                    wnd.document.documentElement.removeAttribute("rxcomplete");
                    r({ result: resultStr });
                }
            }
            setTimeout(cb, 0, targetWnd);
        }
    }
    catch (e) {
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});

// NpPtr GetImageElementFromImageMap(int wndId, int tabId, NpPtr elemId);
RXmsg.addHandler("getImageElementFromImageMap", function (m, r) {
    try {
        var node = RX.node(m.arg0);
        var mapName = node.getAttribute("name");
        var images = node.ownerDocument.getElementsByTagName("img");
        for (var i = 0; i < images.length; i++) {
            var img = images[i];
            if (img.getAttribute("usemap") === "#" + mapName) {
                r({ imgid: RX.id(img) });
                return;
            }
        }
        r({});
    }
    catch (e) {
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});

// flash stuff needs to be executed in non-privileged context
var currentFlashCallback = null;
var flashDispatchHandler = function () {
    document.addEventListener("RxFlashDispatchResquest", function (e) {
        var result = '';
        try {
            var args = e.target.parentNode.getAttribute('rx-flash-args');
            result = e.target.parentNode.CallFunction(args);
        }
        catch (e) {
            // ...
        }

        e.target.setAttribute('rx-flash-result', result);
        var event = document.createEvent("HTMLEvents");
        event.initEvent("RxFlashDispatchResponse", true, false);
        e.target.dispatchEvent(event);
    }, false)
};

RXmsg.addHandler("invokeFlashCallFunction", function (m, r) {
    try {
        var node = RX.node(m.arg0);

        if (!node._rxflashprep) {
            var dispatchNode = node.ownerDocument.createElement('rx-flash-dispatch');
            node.appendChild(dispatchNode);
            dispatchNode.addEventListener("RxFlashDispatchResponse", function (evt) {
                var result = evt.target.getAttribute('rx-flash-result');
                if (currentFlashCallback)
                    currentFlashCallback({ result: result || null });
            }, false, true);

            var codeNode = node.ownerDocument.createElement("script");
            codeNode.textContent = '(' + flashDispatchHandler + ')();';
            node.ownerDocument.documentElement.appendChild(codeNode);
            node.ownerDocument.documentElement.removeChild(codeNode);
            node._rxdispatchnode = dispatchNode;
            node._rxflashprep = true;
        }

        // call flash and return
        currentFlashCallback = r;

        var event = node.ownerDocument.createEvent("HTMLEvents");
        event.initEvent("RxFlashDispatchResquest", true, false);
        node.setAttribute('rx-flash-args', m.arg1);
        node._rxdispatchnode.dispatchEvent(event);
    }
    catch (e) {
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});

// bool PerformClick(int wndId, int tabId, NpPtr elemId, int x, int y);
RXmsg.addHandler("performClick", function (m, r) {
    try {
        var node = RX.node(m.arg0);
        var evt = node.ownerDocument.createEvent("MouseEvents");
        evt.initEvent("click", true, true);
        node.dispatchEvent(evt);
        r({});
    }
    catch (e) {
        r({ err: 'Error ' + e + ' ' + e.stack });
    }
});

RXmsg.addHandler("reflectContent", function (m, r) {
    r({ "reflect": "content", "value": m.arg0 });
});

RXmsg.addDefaultHandler(function (m, r) {
    //handle response from background.js
    if (m.msg === "rx-getframeid-response") {
        var callback = frameCallbackMap[m.id];
        delete frameCallbackMap[m.id];
        if (callback) {
            callback({ frameid: m.childFrameId });
        }
        else {
            r({ err: 'Error: No callback found. ', msg: m.msg });
        }
    }
});

//V3 Support : Move /copy the entire javascript code executed within C#/Ranorex to google chrome extension
RXmsg.addHandler("getallids", function (m, r) {
    try {
        console.log("Hitting getAllIds");
        try {
            var ids = [], all = document.all;
            for (var n = 0; n < all.length; n++) {
                console.log("Hitting for loop inside getAllIds");
                var e = all[n];
                if (typeof (e.getAttribute("id")) === "string") {
                    var val = e.getAttribute("id").trim();
                    if (val.length > 0) {
                        ids.push(val);
                        console.log("value pushed inside getAllIds");
                    }
                    else {
                        console.log("Couldn't push dynamicIds");
                    }
                }
                else {
                    console.log("Couldn't get dynamicIds");
                }
            }
            ids = ids.sort().join('\t');
        }
        catch (e) {
            console.log("Ranorex: Failed to get dynamic ids: " + e);
            r({ err: 'Error ' + e.stack });
        }
        r({ ids: ids });//list of sorted ids returned  to ranorex
        //r({ ids: "test" });

    }
    catch (e) {
        r({ err: 'Error ' + e });
    }
    //r({ ids: "test" });

});

function raiseEvent(eventName, usedTempId, id, r) {
    var _rxtag = document.getElementById(id);

    if (usedTempId == "true") {
        _rxtag.removeAttribute('id');
    }

    if (document.createEvent) {
        var ev = document.createEvent('UIEvents');
        ev.initUIEvent(eventName, true, true, window, 1);
        _rxtag.dispatchEvent(ev);
    }
    else {
        var evt = document.createEventObject();
        evt.button = 1;
        _rxtag.fireEvent('on' + eventName, evt);
    }

    r({ result: "OK" });
}

function trySelfRegister(resp) {
    try {
        if (!resp) {
            chrome.runtime.sendMessage({ "query": "tabinfo" }, trySelfRegister);
        }
        else if (resp.tabid != -1) {
            rxFrameId = resp.frameid;

        }
    }
    catch (e) {
        console.warn("Ranorex: init tab failed: " + e);
    }
};

window.addEventListener("message", receiveMessage, false);

function receiveMessage(event) {
    if (event.data.msg === "rx-getframeid-request") {
        // post to background.js (see onMessage.addListener)
        // special handling for chrome since postMessage back to parent frame not reliable
        RXmsg.post({ msg: "rx-getframeid-response", childFrameId: rxFrameId, parentFrameId: event.data.parentFrameId, id: event.data.id });
    }
}

// send initial message to extension background page, make sure its loaded, then (re-)create msg port
trySelfRegister(null);

