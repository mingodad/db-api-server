/*
 JsLayoutManager without third party dependencies.  (https://github.com/mingodad/slm.js)
 Originally derived from 
 Simple Layout Manager: simplify the layout management of UI in Single Page Applications 
 (https://github.com/alexroat/slm.js)
 Copyright (c) 2014, Domingo Alvarez Duarte - mingodad[at]gmail[dot]com
 
 Released under the GNU LESSER GENERAL PUBLIC LICENSE  Version 3
 
 */

JsLayoutManager = new function () {

	var self = this;
	var nextID = 1;

	self.getAutoId = function (elm) {
		if (!elm.id) {
			var newId;
			while (document.getElementById((newId = 'autoID_' + (nextID++))));
			elm.id = newId;
		}
		return elm.id;
	};

	self.isSpace = function (ch) {
		return (ch === " ") || (ch === "\t") || (ch === "\n") || (ch === "\r") || (ch === "\v");
	};

	self.strHasWord = function (str, word) {
		var found = str.indexOf(word);
		var isSpace = self.isSpace;
		while (found >= 0) {
			if (found === 0) {
				if ((str.length === word.length) ||
					(isSpace(str[word.length])))
					return true;
			} else {
				if (isSpace(str[found - 1])) {
					if ((str.length === found + word.length) ||
						(isSpace(str[found + word.length])))
						return true;
				}
			}
			found = str.indexOf(word, found + 1);
		}
		return false;
	};

	self.strRemoveWord = function (str, word) {
		var found = str.indexOf(word);
		var isSpace = self.isSpace;
		while (found >= 0) {
			if (found === 0) {
				if (str.length === word.length)
					return "";
				if (isSpace(str[word.length]))
					return str.substring(word.length + 1);
			} else {
				if (isSpace(str[found - 1])) {
					var lastPos = found + word.length;
					if (str.length === lastPos) {
						return str.substring(0, found - 1);
					}
					if (isSpace(str[lastPos])) {
						return str.substring(0, found - 1) + str.substring(lastPos);
					}
				}
			}
			found = str.indexOf(word, found + 1);
		}
		return str;
	};

	if (document.classList) {
		self.hasClass = function (elm, className) {
			return className && elm.classList.indexOf(className) >= 0;
		};

		self.addClass = function (elm, className) {
			if (className) {
				if (elm.classList.indexOf(className) >= 0)
					return;
				elm.classList.add(className);
			}
		};

		self.removeClass = function (elm, className) {
			elm.classList.remove(className);
		};
	} else {
		self.hasClass = function (elm, className) {
			var elm_className = elm.className;
			return elm_className && self.strHasWord(elm_className, className);
		};

		self.addClass = function (elm, className) {
			if (self.hasClass(elm, className))
				return;
			var elm_className = elm.className;
			if (elm_className)
				elm.className = elm_className + " " + className;
			else
				elm.className = className;
		};

		self.removeClass = function (elm, className) {
			elm.className = self.strRemoveWord(elm.className, className);
		};
	}

	self.toggleClass = function (elm, className, doAdd) {
		if (doAdd) {
			self.addClass(elm, className);
			return;
		}
		self.removeClass(elm, className);
	};

	self.isArray = function (obj) {
		return Object.prototype.toString.call(obj) === '[object Array]';
	};

	self.addEvent = window.addEventListener ?
		function (obj, evt, fn) {
			obj.addEventListener(evt, fn, false);
		} :
		function (obj, evt, fn) {
			obj.attachEvent('on' + evt, fn);
		};

	self.removeEvent = window.removeEventListener ?
		function (obj, evt, fn) {
			obj.removeEventListener(evt, fn, false);
		} :
		function (obj, evt, fn) {
			obj.detachEvent('on' + evt, fn);
		};

	self.cancelEvent = window.addEventListener ?
		function (e, c) {
			e.preventDefault();
			if (c)
				e.stopPropagation();
		} :
		function (e, c) {
			e.preventDefault ? e.preventDefault() : e.returnValue = false;
			if (c)
				e.cancelBubble = true;
		};

	self.addEventMulti = function (obj, evts, fn) {
		var ary = evts.split(' ');
		for (var i in ary)
			self.addEvent(obj, ary[i], fn);
	};

	self.removeEventMulti = function (obj, evts, fn) {
		var ary = evts.split(' ');
		for (var i in ary)
			self.removeEvent(obj, ary[i], fn);
	};

	self.getEventSource = function (evt) {
		var target = evt.target ? evt.target : evt.srcElement;
		return (target.nodeType === 3) ? target.parentNode : target;
	};
	self.getOffsetX = function (evt) {
		return evt.changedTouches ? evt.changedTouches[0].offsetX : evt.offsetX || evt.layerX;
	};
	self.getOffsetY = function (evt) {
		return evt.changedTouches ? evt.changedTouches[0].offsetY : evt.offsetY || evt.layerY;
	};
	self.getClientX = function (evt) {
		return evt.changedTouches ? evt.changedTouches[0].pageX : evt.clientX;
	};
	self.getClientY = function (evt) {
		return evt.changedTouches ? evt.changedTouches[0].pageY : evt.clientY;
	};

	self.getMousePos = function (evt) {
		if (('targetTouches' in evt) && evt.targetTouches.length) {
			var t = evt.targetTouches[0];
			return {
				x: t.pageX,
				y: t.pageY
			};
		} else if (evt.pageX || evt.pageY)
			return {
				x: evt.pageX,
				y: evt.pageY
			};
		else {
			var delm = document.documentElement;
			var bdy = document.body;
			return {
				x: evt.clientX + delm.scrollLeft - bdy.clientLeft,
				y: evt.clientY + delm.scrollTop - bdy.clientTop
			};
		}
	};

	// As taken from the UnderscoreJS utility framework
	self.debounce = function (func, wait, immediate) {
		var timeout;
		return function () {
			var context = this,
				args = arguments;
			var later = function () {
				timeout = null;
				if (!immediate)
					func.apply(context, args);
			};
			var callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow)
				func.apply(context, args);
		};
	};

	self.getLayout = function (elm) {
		if (elm) {
			var json_str = elm.getAttribute("data-layout");
			if (json_str) {
				json_str = "[{" + json_str + "}][0]";
				//console.log(json_str);
				try {
					//return JSON ? JSON.parse(json_str) : eval(json_str);
					return eval(json_str);
				} catch (ex) {
					console.log(ex, json_str);
				}
			}
		}
		return {};
	};

	self.setLayout = function (elm, obj) {
		var objs = JSON.stringify(obj);
		objs = objs.substr(1, objs.length - 2);
		elm.setAttribute("data-layout", objs);
	};

	self.invalidate = function (elm) {
		var objLayout = self.getLayout(elm);
		objLayout.ok = false;
		self.setLayout(elm, objLayout);
		self.manageLayout(elm);
	};

	self.getFullElmSize = function (elm) {
		var elmHeight, elmHMargin, elmWdith, elmWMargin, cs;
		if (document.all) { // IE
			elmHeight = elm.currentStyle.height;
			elmHMargin = parseInt(elm.currentStyle.marginTop, 10) + parseInt(elm.currentStyle.marginBottom, 10);
			elmWMargin = parseInt(elm.currentStyle.marginLeft, 10) + parseInt(elm.currentStyle.marginRight, 10);
		} else { // Mozilla
			cs = document.defaultView.getComputedStyle(elm, null);
			elmHeight = elm.offsetHeight;
			elmHMargin = parseInt(cs.marginTop) + parseInt(cs.marginBottom);
			elmWdith = elm.offsetWidth;
			elmWMargin = parseInt(cs.marginLeft) + parseInt(cs.marginRight);
		}
		return {
			heigth: (elmHeight + elmHMargin),
			width: (elmWdith + elmWMargin)
		};
	};

	self.setCss = function (elm, kv) {
		var i, len, k, style;
		var setStyle = function (elm, kv) {
			style = elm.style;
			for (k in kv) {
				style[k] = kv[k];
			}
		};
		if (self.isArray(elm)) {
			for (i = 0, len = elm.length; i < len; ++i) {
				setStyle(elm[i], kv);
			}
		} else {
			setStyle(elm, kv);
		}
	};
	self.getCss = function (elm, k) {
		return elm.style[k];
	};

	self.addStr_px = function (x) {
		return x + "px";
	};

	self.elmHide = function (elm) {
		var i, len, style;
		var setDisplay = function (elm) {
			style = elm.style;
			if (style.display && style.display !== 'none') {
				style.hideSavedDisplay = style.display;
			}
			elm.style.display = 'none';
		};
		if (self.isArray(elm)) {
			for (i = 0, len = elm.length; i < len; ++i) {
				setDisplay(elm[i]);
			}
		} else {
			setDisplay(elm);
		}
	};

	self.elmShow = function (elm) {
		var style = elm.style;
		if (style.hideSavedDisplay) {
			style.display = style.hideSavedDisplay;
			style.hideSavedDisplay = null;
		} else {
			elm.style.display = '';
		}
	};

	self.hideChilds = function (elm) {
		var i, len, tc = elm.children;
		for (i = 0, len = tc.length; i < len; ++i) {
			self.elmHide(tc[i]);
		}
	};

	self.getChildrenByClass = function (elm, cls, notHaving) {
		var children = elm.children;
		var result = [];
		var i = 0,
			len = children.length;
		for (; i < len; ++i) {
			var child = children[i];
			var ok_to_add = self.hasClass(child, cls);
			if (notHaving) {
				ok_to_add = !ok_to_add;
			}
			if (ok_to_add) {
				result.push(child);
			}
		}
		return result;
	};
	self.removeChildrenByClass = function (elm, cls) {
		var children = elm.children;
		var toRemove = self.getChildrenByClass(elm, cls);
		var i = 0;
		var len = toRemove.length;
		for (; i < len; ++i) {
			elm.removeChild(toRemove[i]);
		}
	};
	self.removeClassForChildren = function (elm, cls) {
		var children = elm.children;
		var i = 0;
		var len = children.length;
		for (; i < len; ++i) {
			self.removeClass(children[i], cls);
		}
	};

	self.getPercentage = function (snum) {
		if (snum && (typeof snum === "string") && snum.indexOf("%") > 0) {
			snum = parseFloat(snum);
			return isNaN(snum) ? null : snum;
		}
		return null;
	};

	self.getNumber = function (snum, dflt) {
		if (snum && (typeof snum === "string")) {
			snum = parseFloat(snum);
		}
		return isNaN(snum) ? dflt : snum;
	};

	self.getInteger = function (snum, dflt) {
		if (snum && (typeof snum === "string")) {
			snum = parseInt(snum);
		}
		return isNaN(snum) ? dflt : snum;
	};

	self.createBorderMirror = function (elm) {
		var bm = document.createElement('div');
		bm.className = "resizer-mirror-tmp";
		self.setCss(bm, {
			"position": "absolute",
			"left": self.addStr_px(elm.offsetLeft),
			"top": self.addStr_px(elm.offsetTop),
			"width": self.addStr_px(elm.offsetWidth),
			"height": self.addStr_px(elm.offsetHeight)
		});
		elm.parentNode.appendChild(bm);
		return bm;
	};

	self.getBorderMirror = function (elm) {
		var bm = self.getChildrenByClass(elm.parentNode, "resizer-mirror-tmp");
		return bm.length ? bm[0] : null;
	};

	self.removeBorderMirror = function (elm) {
		self.removeChildrenByClass(elm.parentNode, "resizer-mirror-tmp");
	};

	self.setCssBorderMirror = function (elm, ocss) {
		var bm = self.getBorderMirror(elm);
		self.setCss(bm, ocss);
	};

	//crea gestione resize su target
	self.manageOnResize = function (target) {
		var d;
		var fmousemove = function (e) {
			var objLayout = self.getLayout(target);
			var dx = e.pageX - d.ex;
			var dy = e.pageY - d.ey;
			var edge = d.edge;
			if (edge.right)
				objLayout.w = d.w + dx;
			if (edge.bottom)
				objLayout.h = d.h + dy;
			if (edge.left) {
				objLayout.w = d.w - dx;
				objLayout.x = d.x + dx;
			}
			if (edge.top) {
				objLayout.h = d.h - dy;
				objLayout.y = d.y + dy;
			}
			self.setLayout(target, objLayout);
			self.manageLayout(target);
			self.cancelEvent(e);
		};
		var fmouseup = function (e) {
			self.removeEvent(document, "mouseup", fmouseup);
			self.removeEvent(document, "mousemove", fmousemove);
		};
		var fmousedown = function (e) {
			//calcolo edge resize
			var x = e.pageX - target.offsetLeft;
			var y = e.pageY - target.offsetTop;
			var w = target.offsetWidth;
			var h = target.offsetHeight;
			var q = 4;
			var l = {
				left: x < q,
				top: y < q,
				right: w - x < q,
				bottom: h - y < q
			};
			if (l.left || l.top || l.right || l.bottom) {
				objLayout = self.getLayout(target);
				objLayout.ex = e.pageX;
				objLayout.ey = e.pageY;
				objLayout.edge = l;
				self.addEvent(document, "mousemove", fmousemove);
				self.addEvent(document, "mouseup", fmouseup);
			}
		};
		self.addEvent(target, "mousedown", fmousedown);
	};

	var tabsDoAction = function (action, options) {
		var tabsElm = options.tabs;
		if (!tabsElm && options.tabChild) {
			tabsElm = options.tabChild.parentNode;
		}
		var objLayout = self.getLayout(tabsElm);
		var doLayout = function () {
			objLayout.ok = false;
			self.setLayout(tabsElm, objLayout);
			self.manageLayout(tabsElm);
		};
		if (objLayout.sz === "tabs") {
			switch (action) {
			case "new-tab":
				var newTab = document.createElement('div');
				self.addClass(newTab, "tabbody");
				self.setLayout(newTab, {
					"title": options.title
				});
				tabsElm.appendChild(newTab);
				doLayout();
				return newTab;
				break;
			case "remove-tab":
				tabsElm.removeChild(options.tabChild);
				doLayout();
				break;
			case "get-tab-title":
				objLayout = self.getLayout(options.tabChild);
				return objLayout.title;
				break;
			case "set-tab-title":
				objLayout = self.getLayout(options.tabChild);
				objLayout.title = options.title;
				self.setLayout(options.tabChild, {
					"title": options.title
				});
				doLayout();
				break;
			}
		}
	};

	self.tabsAddTab = function (tabsElm, newTabTitle) {
		return tabsDoAction("new-tab", {
			tabs: tabsElm,
			title: newTabTitle
		});
	};

	self.tabsRemoveTab = function (theTabElm) {
		tabsDoAction("remove-tab", {
			tabChild: theTabElm
		});
	};

	self.tabsGetTabTitle = function (theTabElm) {
		return tabsDoAction("get-tab-title", {
			tabChild: theTabElm
		});
	};

	self.tabsSetTabTitle = function (theTabElm, newTabTitle) {
		tabsDoAction("set-tab-title", {
			tabChild: theTabElm,
			title: newTabTitle
		});
	};

	self.tabsSelect = function (tabsElm, tabId) {
		var children = self.getChildrenByClass(tabsElm, "tabheader");
		if (children.length) {
			var tab_header = children[0];
			var tabId_type = typeof tabId;
			if (tabId_type === 'number') {
				tab_header.childNodes[tabId].click();
			} else if (tabId_type === 'string') {
				var childNodes = tab_header.childNodes;
				for (var i = 0, len = childNodes.length; i < len; ++i) {
					var title = childNodes[i].innerText;
					if (title === tabId) {
						childNodes[i].click();
						break;
					}
				}
			}
		}
	};

	self.spliterOpenClose = function (splitVH, child01, openTrue) {
		var objLayout = self.getLayout(splitVH);
		var splitter = splitVH.children[0];
		//var child0 = splitVH.children[1];
		//var child1 = splitVH.children[2];

		if (openTrue && objLayout.savedSash) {
			objLayout.sash = objLayout.savedSash;
			objLayout.savedSash = null;
		} else {
			objLayout.savedSash = objLayout.sash;
			var vdiff = (objLayout.sz === "splitH" ?
				(splitVH.clientWidth - splitter.offsetWidth) : (splitVH.clientHeight - splitter.offsetHeight));
			if (objLayout.inverse) {
				objLayout.sash = (child01 === 0) ? vdiff : 0;
			} else {
				objLayout.sash = (child01 === 0) ? 0 : vdiff;
			}
		}
		self.setLayout(splitVH, objLayout);
		self.manageLayout(splitVH);
	};

	var splitVH = function (elmToManage, objLayout, elmToManageChildren) {
		var i, len, spl, drag, handle_mousedown, handle_mouseup, handle_mousemove;
		var offsetSize, splOffsetSize, isVertical = (objLayout.sz === "splitV");
		var clientSize = isVertical ? elmToManage.clientHeight : elmToManage.clientWidth;
		//creazione splitter
		if (!objLayout.ok) {
			offsetSize = isVertical ? elmToManage.offsetHeight : elmToManage.offsetWidth;
			i = self.getPercentage(objLayout.sash);
			if (i !== null) {
				objLayout.sash = (clientSize / 100.0) * i;
			} else {
				objLayout.sash = self.getNumber(objLayout.sash, clientSize / 2);
			}
			self.setLayout(elmToManage, objLayout);
			self.setCss(elmToManage, {
				overflow: 'hidden'
			});
			spl = document.createElement('div');
			self.addClass(spl, "slmignore splitter");

			if (isVertical) {
				self.setCss(spl, {
					"position": "absolute",
					"left": 0,
					"right": 0,
					"height": "5px",
					"overflow": "hidden",
					"cursor": "row-resize"
				});
			} else {
				self.setCss(spl, {
					"position": "absolute",
					"top": 0,
					"bottom": 0,
					"width": "5px",
					"overflow": "hidden",
					"cursor": "col-resize"
				});
			}
			elmToManage.insertBefore(spl, elmToManage.firstChild);
			splOffsetSize = isVertical ? spl.offsetHeight : spl.offsetWidth;
			drag = -1;

			handle_mousemove = function (e) {
				if (drag) {
					var offset = (isVertical ? e.pageY : e.pageX);
					offset = (objLayout.inverse ? -offset : offset) - drag;
					if (offset > 0 && offset < (offsetSize - splOffsetSize)) {
						var bm = self.getBorderMirror(spl);
						if (bm) {
							offset = objLayout.inverse ? clientSize - offset : offset;
							var lobj = {};
							lobj[isVertical ? "top" : "left"] = self.addStr_px(offset);
							self.setCss(bm, lobj);
						}
					}
				}
				self.cancelEvent(e);
			};

			handle_mouseup = function (e) {
				if (drag) {
					var offset = (isVertical ? e.pageY : e.pageX);
					offset = (objLayout.inverse ? -offset : offset) - drag;
					if (offset > 0 && offset < (offsetSize - splOffsetSize)) {
						objLayout.sash = offset;
						self.setLayout(elmToManage, objLayout);
						self.manageLayout(elmToManage);
					}
				}
				drag = 0;
				self.removeBorderMirror(spl);
				self.cancelEvent(e);
				self.removeEventMulti(window, "mouseup touchend", handle_mouseup);
				self.removeEventMulti(window, "mousemove touchmove", handle_mousemove);
			};

			handle_mousedown = function (e) {
				drag = (isVertical ? e.pageY : e.pageX);
				drag = (objLayout.inverse ? -drag : drag) - objLayout.sash;
				var rs = self.createBorderMirror(spl);
				self.cancelEvent(e);
				self.addEventMulti(window, "mouseup touchend", handle_mouseup);
				self.addEventMulti(window, "mousemove touchmove", handle_mousemove);
			};
			self.addEventMulti(spl, "mousedown touchstart", handle_mousedown);


			objLayout.ok = true;
			self.setLayout(elmToManage, objLayout);
		}
		//adattamento children
		var mysash = objLayout.inverse ? clientSize - objLayout.sash : objLayout.sash;
		var sashPx = self.addStr_px(mysash);
		var sash5Px = self.addStr_px(mysash + 5);
		var lobj = {
			"position": "absolute",
			"left": 0,
			"top": 0,
			"right": 0,
			"bottom": 0
		};

		if (isVertical) {
			lobj.right = 0;
			lobj.height = sashPx;
			self.setCss(elmToManageChildren[0], lobj);
			delete lobj.height;
			lobj.top = sash5Px;
			self.setCss(elmToManageChildren[1], lobj);
		} else {
			lobj.bottom = 0;
			lobj.width = sashPx;
			self.setCss(elmToManageChildren[0], lobj);
			delete lobj.width;
			lobj.left = sash5Px;
			self.setCss(elmToManageChildren[1], lobj);
		}

		lobj = {};
		lobj[isVertical ? "top" : "left"] = sashPx;
		self.setCss(self.getChildrenByClass(elmToManage, "splitter"), lobj);
		return false;
	};

	self.layoutFunctions = {
		absolute: function (elmToManage, objLayout, c) {
			if (!objLayout.ok) {
				self.setCss(elmToManage, {
					overflow: "hidden"
				});
				objLayout.x = isNaN(objLayout.x) ? 0 : objLayout.x;
				objLayout.y = isNaN(objLayout.y) ? 0 : objLayout.y;
				objLayout.w = isNaN(objLayout.w) ? 0 : objLayout.w;
				objLayout.h = isNaN(objLayout.h) ? 0 : objLayout.h;
				self.setCss(elmToManage, {
					"position": "absolute",
					"left": self.addStr_px(objLayout.x),
					"top": self.addStr_px(objLayout.y),
					"width": self.addStr_px(objLayout.w),
					"height": self.addStr_px(objLayout.h)
				});
				objLayout.ok = true;
				self.setLayout(elmToManage, objLayout);
			}
		},
		fullpage: function (elmToManage, objLayout, c, propagate) {
			var c0;
			if (!objLayout.ok) {
				self.setCss(elmToManage, {
					overflow: 'hidden'
				});
				//vincola il contenitore alla finestra e aggancia gli eventi di resize
				self.setCss(elmToManage, {
					"position": "fixed",
					"left": 0,
					"top": 0,
					"right": 0,
					"bottom": 0,
					"width": "",
					"height": ""
				});
				self.addEvent(window, "resize", propagate);
				//figli: il dialog accetta un solo figlio e lo massimizza
				self.elmHide(c);
				c0 = c[0];
				self.setCss(c0, {
					"position": "absolute",
					"left": 0,
					"top": 0,
					"right": 0,
					"bottom": 0
				});
				self.elmShow(c0);
				objLayout.ok = true;
				self.setLayout(elmToManage, objLayout);
			}
		},
		dialog: function (elmToManage, objLayout, c) {
			var drag, handle_mouseup, handle_mousemove;
			if (!objLayout.ok) {
				self.setCss(elmToManage, {
					overflow: 'hidden'
				});
				self.addClass(elmToManage, "slmdialog");
				objLayout.x = isNaN(objLayout.x) ? 100 : objLayout.x;
				objLayout.y = isNaN(objLayout.y) ? 100 : objLayout.y;
				objLayout.w = isNaN(objLayout.w) ? 100 : objLayout.w;
				objLayout.h = isNaN(objLayout.h) ? 100 : objLayout.h;
				self.setCss(elmToManage, {
					"position": "fixed",
					"top": self.addStr_px(objLayout.y),
					"left": self.addStr_px(objLayout.x),
					"width": self.addStr_px(objLayout.w),
					"height": self.addStr_px(objLayout.h),
					"background": "white",
					"border": "2px solid grey"
				});
				//barra del dialog
				var m = 10;
				var hdlg = document.createElement('div');
				self.addClass(hdlg, "slmignore");
				self.setCss(hdlg, {
					"left": 0,
					"top": 0,
					"right": 0,
					"cursor": "move"
				});
				hdlg.innerHTML = "dialog";
				elmToManage.insertBefore(hdlg, elmToManage.firstChild);
				//gestione chiusura
				var hh = self.addStr_px(hdlg.clientHeight);
				var closeDlg = document.createElement('div');
				self.setCss(closeDlg, {
					"position": "absolute",
					"right": 0,
					"top": 0,
					"width": hh,
					"height": hh,
					"background": "rgb(230, 102, 102)",
					"text-align": "center",
					"cursor": "default"
				});
				closeDlg.innerHTML = "x";
				hdlg.appendChild(closeDlg);
				self.addEvent(closeDlg, "click", function () {
					elmToManage.parentNode.removeChild(elmToManage);
				});
				//gestione spostamento

				handle_mousemove = function (e) {
					if (drag) {
						objLayout.x = e.pageX - drag[0];
						objLayout.y = e.pageY - drag[1];
						//setLayout(elmToManage, objLayout);
						self.setCss(elmToManage, {
							"left": self.addStr_px(objLayout.x),
							"top": self.addStr_px(objLayout.y)
						});
						self.cancelEvent(e);
					}
				};
				handle_mouseup = function (e) {
					drag = null;
					self.setLayout(elmToManage, objLayout);
					self.removeEvent(document, "mousemove", handle_mousemove);
					self.removeEvent(document, "mouseup", handle_mouseup);
				};
				self.addEvent(hdlg, "mousedown", function (e) {
					objLayout = self.getLayout(elmToManage);
					drag = [e.pageX - objLayout.x, e.pageY - objLayout.y];
					self.addEvent(document, "mousemove", handle_mousemove);
					self.addEvent(document, "mouseup", handle_mouseup);
				});
				//figli: il dialog accetta un solo figlio e lo massimizza
				self.elmHide(c);
				var c0 = c[0];
				self.setCss(c0, {
					"position": "absolute",
					"left": 0,
					"top": self.addStr_px(hdlg.offsetHeight),
					"right": 0,
					"bottom": 0
				});
				self.elmShow(c0);
				objLayout.ok = true;
				self.setLayout(elmToManage, objLayout);
				self.manageOnResize(elmToManage); //crea gestione resize
			}
		},
		boxV: function (elmToManage, objLayout, elmToManageChildren) {
			var i, o, cc, tcc;
			self.setCss(elmToManage, {
				overflow: 'hidden'
			});
			var r = elmToManage.clientHeight;
			var ta = [];
			var tp = 0;
			//calcolo
			var csize = elmToManageChildren.length;
			for (i = 0; i < csize; i++) {
				cc = elmToManageChildren[i];
				tcc = self.getLayout(cc);
				tcc.p = isNaN(tcc.p) ? 0 : tcc.p;
				tcc.h = isNaN(tcc.h) ? cc.offsetHeight : tcc.h;
				if (tcc.ex) {
					tcc.x = 0;
					tcc.w = elmToManage.clientWidth;
				}
				r -= tcc.h;
				tp += tcc.p;
				ta.push(tcc);
			}
			for (i = 0, o = 0; i < csize; i++) {
				cc = elmToManageChildren[i];
				tcc = ta[i];
				if (tp)
					tcc.h += r * tcc.p / tp;
				tcc.y = o;
				o += tcc.h;
				self.setCss(cc, {
					"position": "absolute",
					"left": self.addStr_px(tcc.x),
					"top": self.addStr_px(tcc.y),
					"width": self.addStr_px(tcc.w),
					"height": self.addStr_px(tcc.h)
				});
			}
		},
		boxH: function (elmToManage, t, elmToManageChildren) {
			var i, o, cc, tcc;
			self.setCss(elmToManage, {
				overflow: 'hidden'
			});
			var r = elmToManage.clientWidth;
			var ta = [];
			var tp = 0;
			//calcolo
			var csize = elmToManageChildren.length;
			for (i = 0; i < csize; i++) {
				cc = elmToManageChildren[i];
				tcc = self.getLayout(cc);
				tcc.p = isNaN(tcc.p) ? 0 : tcc.p;
				tcc.w = isNaN(tcc.w) ? cc.offsetWidth : tcc.w;
				if (tcc.ex) {
					tcc.y = 0;
					tcc.h = elmToManage.clientHeight;
				}
				r -= tcc.w;
				tp += tcc.p;
				ta.push(tcc);
			}
			for (i = 0, o = 0; i < csize; i++) {
				cc = elmToManageChildren[i];
				tcc = ta[i];
				if (tp)
					tcc.w += r * tcc.p / tp;
				tcc.x = o;
				o += tcc.w;
				self.setCss(cc, {
					"position": "absolute",
					"left": self.addStr_px(tcc.x),
					"top": self.addStr_px(tcc.y),
					"width": self.addStr_px(tcc.w),
					"height": self.addStr_px(tcc.h)
				});
			}
		},
		tabs: function (elmToManage, objLayout, elmToManageChildren) {
			var isVisible, i, csize, cc, pt, s;
			var header;
			//creazione header
			csize = elmToManageChildren.length;
			if (!objLayout.ok) {
				objLayout.sel = isNaN(objLayout.sel) ? 0 : objLayout.sel;
				isVisible = (objLayout.o === 'w' || objLayout.o === 'e');
				self.setCss(elmToManage, {
					overflow: 'hidden'
				});
				self.removeChildrenByClass(elmToManage, "slmignore");
				header = document.createElement('div');
				self.addClass(header, "slmignore tabheader");
				self.setCss(header, {
					"position": "absolute",
					"left": 0,
					"top": 0,
					"right": 0,
					"overflow": "hidden"
				});
				elmToManage.insertBefore(header, elmToManage.firstChild);
				for (i = 0; i < csize; i++) {
					cc = elmToManageChildren[i];
					self.addClass(cc, "tabbody");
					pt = self.getLayout(cc);
					pt.title = (pt.title === undefined) ? "tab " + i : pt.title;
					s = document.createElement('div');
					s.innerHTML = pt.title;
					header.appendChild(s);
					self.toggleClass(s, "selected", i === objLayout.sel);
					self.setCss(s, {
						"display": isVisible ? "block" : "inline-block"
					});
					self.addEvent(s, "click", (function (j) {
						return function () {
							self.removeClass(header.children[objLayout.sel], "selected");
							objLayout.sel = j;
							self.setLayout(elmToManage, objLayout);
							self.addClass(this, "selected");
							self.manageLayout(elmToManage);
							if (elmToManage.onchange) {
								elmToManage.onchange(objLayout.sel);
							}
						};
					})(i));
				}
				objLayout.ok = true;
				self.setLayout(elmToManage, objLayout);
			}
			//adattamento children
			objLayout.sel = isNaN(objLayout.sel) ? 0 : objLayout.sel % csize;
			var hs = self.getChildrenByClass(elmToManage, "tabheader");
			hs = self.addStr_px(hs.length ? self.getFullElmSize(hs[0]).heigth : 0);
			//maybe we do not have children
			if (elmToManageChildren.length) {
				self.elmHide(elmToManageChildren);
				var ctsel = elmToManageChildren[objLayout.sel];
				self.setCss(ctsel, {
					"position": "absolute",
					"left": 0,
					"top": hs,
					"right": 0,
					"bottom": 0
				});
				self.elmShow(ctsel);
			}

			return false;
		},
		accordion: function (elmToManage, objLayout, elmToManageChildren) {
			var i, cc, ct, s, csize = elmToManageChildren.length;
			if (!objLayout.ok) {
				objLayout.sel = isNaN(objLayout.sel) ? 0 : objLayout.sel;
				self.setCss(elmToManage, {
					overflow: 'hidden'
				});
				//creazione header accordion
				self.removeChildrenByClass(elmToManage, "accheader");
				for (i = 0; i < csize; i++) {
					cc = elmToManageChildren[i];
					self.addClass(cc, "accheaderbody");
					ct = self.getLayout(cc);
					ct.title = (ct.title === undefined) ? "acc " + i : ct.title;
					s = document.createElement('div');
					self.addClass(s, "slmignore accheader");
					s.innerHTML = ct.title;
					cc.parentNode.insertBefore(s, cc);
					self.addEvent(s, "click", (function (j) {
						return function () {
							objLayout.sel = j;
							self.setLayout(elmToManage, objLayout);
							self.manageLayout(elmToManage);
						};
					})(i));
				}
				objLayout.ok = true;
				self.setLayout(elmToManage, objLayout);
			}
			//ricalcolo spazio
			var aci, ac = self.getChildrenByClass(elmToManage, "accheader");
			var r = elmToManage.clientHeight;
			var acsize = ac.length;
			for (i = 0; i < acsize; i++) {
				aci = ac[i];
				self.toggleClass(aci, "selected", i === objLayout.sel);
				r -= self.getFullElmSize(aci).heigth;
			}
			//adattamento children
			self.elmHide(elmToManageChildren);
			objLayout.sel = isNaN(objLayout.sel) ? 0 : objLayout.sel % csize;
			var ctsel = elmToManageChildren[objLayout.sel];
			self.elmShow(ctsel);
			self.setCss(ctsel, {
				left: 0,
				right: 0,
				height: self.addStr_px(r)
			});
			return false;
		},
		shift: function (elmToManage, objLayout, elmToManageChildren) {
			var i, len, sn, sp, ctsel;
			objLayout.sel = isNaN(objLayout.sel) ? 0 : objLayout.sel;
			//creazione header
			if (!objLayout.ok) {
				self.setCss(elmToManage, {
					overflow: 'hidden'
				});
				self.removeChildrenByClass(elmToManage, "slmignore");
				sn = document.createElement('span');
				self.addClass(sn, "slmignore shift");
				sn.innerHTML = "NEXT";
				self.setCss(sn, {
					"position": "absolute",
					"right": 0,
					"top": 0,
					"overflow": "hidden"
				});
				elmToManage.insertBefore(sn, elmToManage.firstChild);
				self.addEvent(sn, "click", function () {
					var csize = elmToManageChildren.length;
					objLayout.sel = (objLayout.sel + csize + 1) % csize;
					self.setLayout(elmToManage, objLayout);
					self.manageLayout(elmToManage);
				});

				sp = document.createElement('span');
				self.addClass(sp, "slmignore shift");
				sp.innerHTML = "PREV";
				self.setCss(sp, {
					"position": "absolute",
					"left": 0,
					"top": 0,
					"overflow": "hidden"
				});
				elmToManage.insertBefore(sp, elmToManage.firstChild);
				self.addEvent(sp, "click", function () {
					var csize = elmToManageChildren.length;
					objLayout.sel = (objLayout.sel + csize - 1) % csize;
					self.setLayout(elmToManage, objLayout);
					self.manageLayout(elmToManage);
				});
				objLayout.ok = true;
				self.setLayout(elmToManage, objLayout);
			}
			self.setCss(self.getChildrenByClass(elmToManage, "shift"), {
				"top": self.addStr_px(elmToManage.clientHeight / 2)
			});
			//attivazione figlio selezionato
			self.elmHide(elmToManageChildren);
			ctsel = elmToManageChildren[objLayout.sel];
			self.setCss(ctsel, {
				"position": "absolute",
				"left": 0,
				"top": 0,
				"right": 0,
				"bottom": 0
			});
			self.elmShow(ctsel);
			return false;
		},
		splitV: function (elmToManage, objLayout, elmToManageChildren) {
			splitVH(elmToManage, objLayout, elmToManageChildren);
		},
		splitH: function (elmToManage, objLayout, elmToManageChildren) {
			splitVH(elmToManage, objLayout, elmToManageChildren);
		},
		snap: function (elmToManage, objLayout, elmToManageChildren) {
			self.setCss(elmToManage, {
				overflow: 'hidden'
			});
			var i = self.getPercentage(objLayout.sash);
			if (i !== null) {
				objLayout.snap = (elmToManage.clientWidth / 100.0) * i;
			} else {
				objLayout.snap = isNaN(objLayout.snap) ? 32 : objLayout.snap;
			}
			self.setLayout(elmToManage, objLayout);
			var w = elmToManage.offsetWidth;
			var ox = objLayout.snap;
			var oy = objLayout.snap;
			var maxch = 0;
			var rowcnt = 0;
			var csize = elmToManageChildren.length;
			for (i = 0; i < csize; i++) {
				var cc = elmToManageChildren[i];
				var ct = self.getLayout(cc);
				var cw = (isNaN(ct.sx) ? 1 : ct.sx) * objLayout.snap;
				var ch = (isNaN(ct.sy) ? 1 : ct.sy) * objLayout.snap;
				if (ox + cw > w && rowcnt > 0) {
					ox = objLayout.snap;
					oy += maxch + objLayout.snap;
					maxch = 0;
				}
				self.setCss(cc, {
					top: self.addStr_px(oy),
					left: self.addStr_px(ox),
					width: self.addStr_px(cw),
					height: self.addStr_px(ch),
					position: 'absolute'
				});
				rowcnt++;
				ox += cw + objLayout.snap;
				maxch = ch > maxch ? ch : maxch; //stride
			}
			return false;
		},
		menu: function (elmToManage, objLayout, elmToManageChildren) {
			var i, len, j, jlen, cc, elm, pc, fhide;
			if (!objLayout.ok) {
				objLayout.bar = !!objLayout.bar; //indica se il menu è a barra
				self.setCss(elmToManage, {
					overflow: "initial"
				});
				var fshow = (function (bar) {
					return function (e) {
						e.preventDefault();
						var i, len, elm, tc, ocss = {
							position: 'absolute',
							top: self.addStr_px(bar ? this.offsetHeight - 1 : 0),
							left: self.addStr_px(bar ? 0 : this.offsetWidth - 1)
						};
						tc = this.children;
						for (i = 0, len = tc.length; i < len; ++i) {
							elm = tc[i];
							self.setCss(elm, ocss);
							self.elmShow(elm);
						}
					};
				})(objLayout.bar);
				fhide = function () {
					self.hideChilds(this);
				};
				self.addClass(elmToManage, "menu");
				if (objLayout.bar)
					self.addClass(elmToManage, "menubar");
				for (i = 0, len = elmToManageChildren.length; i < len; ++i) {
					elm = elmToManageChildren[i];
					self.addEvent(elm, "mouseenter", fshow);
					self.addEvent(elm, "mouseleave", fhide);
				}
				objLayout.ok = true;
				self.setLayout(elmToManage, objLayout);
				for (i = 0, len = elmToManageChildren.length; i < len; ++i) {
					cc = elmToManageChildren[i].children;
					for (j = 0, jlen = cc.length; j < jlen; ++j) {
						self.elmHide(cc[j]);
						self.manageLayout(cc[j]);
					}
				}
				self.manageLayout(elmToManage.parentNode);
			}

			return false;
		},
		flap: function (elmToManage, objLayout, elmToManageChildren) {
			var isVisible, header, csize, i, len, cc, pt, s;
			//creazione header
			if (!objLayout.ok) {
				self.setCss(elmToManage, {
					overflow: 'hidden',
					position: 'absolute'
				});
				self.addClass(elmToManage, "exclude");
				isVisible = (objLayout.o === 'w' || objLayout.o === 'e');

				self.removeChildrenByClass(elmToManage, "slmignore");
				header = document.createElement('div');
				self.addClass(header, "slmignore tabheader");
				self.setCss(header, {
					"position": "absolute",
					"overflow": "hidden"
				});
				elmToManage.insertBefore(header, elmToManage.firstChild);
				csize = elmToManageChildren.length;
				for (i = 0; i < csize; i++) {
					cc = elmToManageChildren[i];
					pt = self.getLayout(cc);
					pt.title = (pt.title === undefined) ? "tab " + i : pt.title;
					s = document.createElement('div');
					s.innerHTML = pt.title;
					header.appendChild(s);
					self.setCss(s, {
						"display": isVisible ? "block" : "inline-block"
					});
					self.addEvent(s, "click", ((function (j) {
						return function () {
							self.removeClassForChildren(header, "selected");
							self.addClass(this, "selected");
							if (objLayout.sel === j) {
								objLayout.sel = undefined;
							} else {
								objLayout.sel = j;
							}
							self.setLayout(elmToManage, objLayout);
							self.manageLayout(elmToManage);
						};
					})(i)));
					if (self.getCss(cc, "overflow") === "visible")
						self.setCss(cc, {
							"overflow": "auto"
						});
				}
				switch (objLayout.o) {
				case 'n':
					self.setCss(elmToManage, {
						top: 0,
						left: 0,
						right: 0,
						bottom: 'auto',
						width: 'auto',
						height: self.addStr_px(objLayout.h)
					});
					self.setCss(header, {
						bottom: 0,
						left: 0,
						right: 0
					});
					break;
				case 's':
					self.setCss(elmToManage, {
						bottom: 0,
						left: 0,
						right: 0,
						top: 'auto',
						width: 'auto',
						height: self.addStr_px(objLayout.h)
					});
					self.setCss(header, {
						top: 0,
						left: 0,
						right: 0
					});
					break;
				case 'w':
					self.setCss(elmToManage, {
						top: 0,
						bottom: 0,
						left: 0,
						right: 'auto',
						height: 'auto',
						width: self.addStr_px(objLayout.w)
					});
					self.setCss(header, {
						top: 0,
						bottom: 0,
						right: 0
					});
					break;
				case 'e':
					self.setCss(elmToManage, {
						top: 0,
						bottom: 0,
						right: 0,
						left: 'auto',
						height: 'auto',
						width: self.addStr_px(objLayout.w)
					});
					self.setCss(header, {
						top: 0,
						bottom: 0,
						left: 0
					});
					break;
				}

				objLayout.ok = true;
				self.setLayout(elmToManage, objLayout);
				self.invalidate(elmToManage.parentNode);
			}

			//using header as variable name overwrite the header declared inside the above if statement
			//that is a closure variable used in onclick event
			var myHeader = self.getChildrenByClass(elmToManage, "tabheader")[0];

			var full_size = self.getFullElmSize(myHeader);
			var hs = self.addStr_px(full_size.heigth);
			var ws = self.addStr_px(full_size.width);
			var opened = (objLayout.sel !== undefined);
			self.setCss(elmToManageChildren, {
				position: 'absolute'
			});
			switch (objLayout.o) {
			case 'n':
				self.setCss(elmToManageChildren, {
					top: 0,
					left: 0,
					right: 0,
					bottom: hs
				});
				self.setCss(elmToManage, {
					height: (opened ? self.addStr_px(objLayout.h) : hs)
				});
				break;
			case 's':
				self.setCss(elmToManageChildren, {
					bottom: 0,
					left: 0,
					right: 0,
					top: hs
				});
				self.setCss(elmToManage, {
					height: (opened ? self.addStr_px(objLayout.h) : hs)
				});
				break;
			case 'w':
				self.setCss(elmToManageChildren, {
					top: 0,
					bottom: 0,
					left: 0,
					right: ws
				});
				self.setCss(elmToManage, {
					width: (opened ? self.addStr_px(objLayout.w) : ws)
				});
				break;
			case 'e':
				self.setCss(elmToManageChildren, {
					top: 0,
					bottom: 0,
					right: 0,
					left: ws
				});
				self.setCss(elmToManage, {
					width: (opened ? self.addStr_px(objLayout.w) : ws)
				});
				break;
			}
			self.elmHide(elmToManageChildren);
			if (objLayout.sel !== undefined)
				self.elmShow(elmToManageChildren[objLayout.sel]);

			return false;

		}
	};

	self.manageLayout = function (elmToManage) {

		var objLayout = self.getLayout(elmToManage);

		//funzioni di geomerty handling
		var elmToManageChildren;
		var myLayoutFunction = self.layoutFunctions[objLayout.sz];

		var propagate = function () {
			var i, len, elm, position = self.getCss(elmToManage, "position");
			if (!position || position === "static")
				self.setCss(elmToManage, {
					"position": "relative"
				});

			var ttc = [];
			elmToManageChildren = [];
			var children = elmToManage.children;
			for (var i = 0, len = children.length; i < len; ++i) {
				elm = children[i];
				if (!self.hasClass(elm, "slmignore")) {
					ttc.push(elm);
					if (!self.hasClass(elm, "exclude")) {
						self.setCss(elm, {
							height: "",
							width: ""
						});
						elmToManageChildren.push(elm);
					}
				}
			}

			if (myLayoutFunction)
				myLayoutFunction(elmToManage, objLayout, elmToManageChildren, propagate);

			for (i = 0, len = ttc.length; i < len; ++i) {
				elm = ttc[i];
				if (elm.clientWidth && elm.clientHeight) //is it visible ?
				{
					self.manageLayout(elm);
				}
			}
		};

		propagate(); //propagate event to the children
	};
	return self;
};