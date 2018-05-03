/*
 * Copyright (C) 2015 by Domingo Alvarez Duarte <mingodad@gmail.com>
 *
 * Licensed under GPLv3, see http://www.gnu.org/licenses/gpl.html.
 */

var $dble = {}; //db-api-list-edit
	
var api_base_uri = "/api/";
var the_api_base_uri;
var the_list_table_id = "le_tbl-list";

var the_textarea_style_storage_prefix = "textarea-style-";

function $id(id){return document.getElementById(id);}

var __isIE__ = navigator.appName == 'Microsoft Internet Explorer';

var __isAndroid__ = navigator.userAgent.match(/Android/i);
var __isiOS__ = navigator.userAgent.match(/iPhone|iPad|iPod/i);

var getInnerText = __isIE__ ? 
	function(node) {return node.innerText;} : 
		function(node) {return node.textContent;};

var setInnerText = __isIE__ ? 
	function(node, content) {node.innerText = content;} : 
		function(node, content) {node.textContent = content;};
		
function getTimming()
{
	//return performance.now();
	return new Date();
}

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (position === undefined || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}

function setBodyCursor(cursor) {document.body.style.cursor = cursor ? cursor : 'auto';}
function setWaitCursor() {document.documentElement.style.cursor = 'wait';}
function setDefaultCursor() {document.documentElement.style.cursor = 'auto';}


var myAddEventListener = 'addEventListener' in window ?
	function(obj,evt,fn) {obj.addEventListener(evt,fn,false);} :
	function(obj,evt,fn) {obj.attachEvent('on'+evt,fn);};
	
function isRightClick(ev) {
	return (ev.which === 3 || ev.button === 2);
}

function doubleClickManager() {
	var self = this;
	self.time = 200;
	self.delay = 100;
	self.savedEvent = null;
	self.savedTimer = null;
	self.clickHandler = null;
	self.sender = null;

	self.doClick = function () {
		self.savedTimer = null;
		if (self.clickHandler)
			self.clickHandler(self.sender, self.savedEvent, false);
	};

	self.doDoubleClick = function () {
		if (self.savedTimer != null) {
			clearTimeout(self.savedTimer); // Clear pending Click  
			self.savedTimer = null;
		}
		if (self.clickHandler)
			self.clickHandler(self.sender, self.savedEvent, true);
	};

	self.handleclick = function (sender, ev, clickHandler) {
		if (!ev) ev = window.event;
		self.savedEvent = ev;
		self.clickHandler = clickHandler;
		self.sender = sender;
		if (self.savedTimer) self.doDoubleClick();
		else self.savedTimer = setTimeout(function () {
			self.doClick();
		}, self.time);
	};
	return self.handleclick;
}

function show_map(map_query, target) {
	if(__isAndroid__)
	{
		window.open("geo:0,0?" + map_query, target);
	}
	else if(__isiOS__)
	{
		window.open("maps:0,0?" + map_query, target);
	}
	else
	{
		//window.open("https://maps.google.es/maps?" + map_query, target);
		window.open("https://www.bing.es/maps?where1=" + map_query.substr(2), target);
	}
	return false;
}

var tableViewHandleClick = new doubleClickManager();

function tableClick(self, ev) {
	if (!ev) ev = window.event;
	for (var tdvar = ev.target || ev.srcElement; tdvar && tdvar != self; tdvar = tdvar.parentNode)
		if (tdvar.tagName == "TD" && tdvar.parentNode.parentNode.parentNode == self) {
			//alert(tdvar.parentNode.rowIndex + ":" + tdvar.cellIndex);
			return tdvar;
		}
}

function tableClickGetId(self, event) {
	var td = tableClick(self, event);
	if (td) {
		var tr = td.parentNode;
		return tr.firstChild.innerHTML;
	}
}

function getFirstParentWithTagName( element, tagName ) {
	var pn = element;
	while(pn = pn.parentNode){
		if ( pn.tagName === tagName ) return pn;
	}
};

function getFirstChildWithTagName( element, tagName ) {
	var cn = element.childNodes;
	for ( var i = 0, cnl = cn.length; i < cnl; i++ ) {
		var elm = cn[i];
		if ( elm.nodeName === tagName ) return elm;
		var found = getFirstChildWithTagName( elm, tagName );
		if( found ) return found;
	}
};

function strTrim(st) {return st.replace(/^\s+|\s+$/g, '');};

function mkValidIdentifier(str)
{
	str = strTrim(str);
	str = str.replace(" ", "_");
	str = str.toLowerCase();
	return str.match("^[_a-z][_a-zA-Z0-9]+");
}

var dad = {};

dad.localeDecimalSeparator = (1.1).toLocaleString().substring(1, 2);

dad.formatCurrency = function(v, number_of_decimals, decimal_separator, currency_sign){
	if(number_of_decimals == null) number_of_decimals = 2;
	if(currency_sign == null) currency_sign = "";
	if(decimal_separator == null) decimal_separator = dad.localeDecimalSeparator;

  return (isNaN(v)? v : parseInt(v||0).toLocaleString() +
		(decimal_separator) +
		(v*1).toFixed(number_of_decimals).slice(-number_of_decimals)) +
		currency_sign;
};

dad.formatNumeric = function(v){
	return isNaN(v)? v : parseFloat(v);
};

dad.formatBoolean = function(v){
	return v == "1" ? "+" : "";
};

function parseColumnsName(columns_name_ary)
{
	var result = {};
	var header_name_col = 0;
	var header_title_col = 1;
	var header_size_col = 2;
	var header_align_col = 3;
	var header_format_col = 4;
	var col_count = columns_name_ary.length;
	var myColsAlign = new Array(col_count);
	result.cols_align = myColsAlign;
	var myColsFormat = new Array(col_count);
	result.cols_format = myColsFormat;
	var myColsTitle = new Array(col_count);
	result.cols_title = myColsTitle;
	var myColsName = new Array(col_count);
	result.cols_name = myColsName;
	var myColsSize = new Array(col_count);
	result.cols_size = myColsSize;

	for(var i=0; i<col_count; ++i){
		var ar = columns_name_ary[i].split("|");
		myColsName[i] = ar[header_name_col];
		myColsTitle[i] = ar[header_title_col] || "?";
		myColsSize[i] = ar[header_size_col];
		var align = ar[header_align_col];
		if(align){
			switch(align){
				case "C": myColsAlign[i] =  "center"; break;
				case "R": myColsAlign[i] =  "right"; break;
				default: myColsAlign[i] = false; //default align left
			}
		}
		else myColsAlign[i] = false; //default align left
		var format = ar[header_format_col];
		if(format === "M") myColsFormat[i] = dad.formatCurrency;
		else if(format === "N") myColsFormat[i] = dad.formatNumeric;
		else if(format === "B") myColsFormat[i] = dad.formatBoolean;
		else myColsFormat[i] = false;
	}
	return result;
}

/*!
 * tablesort v3.0.2 (2015-02-25)
 * http://tristen.ca/tablesort/demo/
 * Copyright (c) 2015 ; Licensed MIT
*/!function(){function a(a,b){if(!a||"TABLE"!==a.tagName)throw new Error("Element must be a table");this.init(a,b||{})}var b=[],c=function(a){var b;return window.CustomEvent&&"function"==typeof window.CustomEvent?b=new CustomEvent(a):(b=document.createEvent("CustomEvent"),b.initCustomEvent(a,!1,!1,void 0)),b},d=function(a){return a.getAttribute("data-sort")||a.textContent||a.innerText||""},e=function(a,b){return a=a.toLowerCase(),b=b.toLowerCase(),a===b?0:b>a?1:-1},f=function(a,b){return function(c,d){var e=a(c.td,d.td);return 0===e?b?d.index-c.index:c.index-d.index:e}};a.extend=function(a,c,d){if("function"!=typeof c||"function"!=typeof d)throw new Error("Pattern and sort must be a function");b.push({name:a,pattern:c,sort:d})},a.prototype={init:function(a,b){var c,d,e,f,g=this;if(g.table=a,g.thead=!1,g.options=b,a.rows&&a.rows.length>0&&(a.tHead&&a.tHead.rows.length>0?(c=a.tHead.rows[a.tHead.rows.length-1],g.thead=!0):c=a.rows[0]),c){var h=function(){g.current&&g.current!==this&&(g.current.classList.remove("sort-up"),g.current.classList.remove("sort-down")),g.current=this,g.sortTable(this)};for(e=0;e<c.cells.length;e++)f=c.cells[e],f.classList.contains("no-sort")||(f.classList.add("sort-header"),f.addEventListener("click",h,!1),f.classList.contains("sort-default")&&(d=f));d&&(g.current=d,g.sortTable(d))}},sortTable:function(a,g){var h=this,i=a.cellIndex,j=e,k="",l=[],m=h.thead?0:1,n=a.getAttribute("data-sort-method");if(h.table.dispatchEvent(c("beforeSort")),!(h.table.rows.length<2)){if(!n){for(;l.length<3&&m<h.table.tBodies[0].rows.length;)k=d(h.table.tBodies[0].rows[m].cells[i]),k=k.trim(),k.length>0&&l.push(k),m++;if(!l)return}for(m=0;m<b.length;m++)if(k=b[m],n){if(k.name===n){j=k.sort;break}}else if(l.every(k.pattern)){j=k.sort;break}h.col=i;var o,p,q=[],r={},s=0,t=0;for(m=0;m<h.table.tBodies.length;m++)for(o=0;o<h.table.tBodies[m].rows.length;o++)k=h.table.tBodies[m].rows[o],k.classList.contains("no-sort")?r[s]=k:q.push({tr:k,td:d(k.cells[h.col]),index:s}),s++;for(g?p=a.classList.contains("sort-up")?"sort-up":"sort-down":(p=a.classList.contains("sort-up")?"sort-down":a.classList.contains("sort-down")?"sort-up":h.options.descending?"sort-up":"sort-down",a.classList.remove("sort-down"===p?"sort-up":"sort-down"),a.classList.add(p)),"sort-down"===p?(q.sort(f(j,!0)),q.reverse()):q.sort(f(j,!1)),m=0;s>m;m++)r[m]?(k=r[m],t++):k=q[m-t].tr,h.table.tBodies[0].appendChild(k);h.table.dispatchEvent(c("afterSort"))}},refresh:function(){void 0!==this.current&&this.sortTable(this.current,!0)}},"undefined"!=typeof module&&module.exports?module.exports=a:window.Tablesort=a}();

function getEvent(evt) {return evt || window.event;}

function getEventSource(evt) {
	evt = getEvent(evt);
	var target = evt.target ? evt.target : evt.srcElement;
	return (target.nodeType === 3) ? target.parentNode : target;
};

function disabledEventPropagation(event)
{
   if (event.stopPropagation){
       event.stopPropagation();
   }
   else if(window.event){
      window.event.cancelBubble=true;
   }
}

function functionStringTemplateToString(fn)
{
	//function is expected to be define as function(){/**/}
	var function_start = "function(){/*";
	var function_end = "*/";
	var str = fn.toString();
	return str.substring(function_start.length + 1, str.length - function_end.length -1);
}

//css related start
function setStyle(cssText) {
    var sheet = document.createElement('style');
    sheet.type = 'text/css';
    /* Optional */ window.customSheet = sheet;
    (document.head || document.getElementsByTagName('head')[0]).appendChild(sheet);
    return (setStyle = function(cssText, node) {
        if(!node || node.parentNode !== sheet)
            return sheet.appendChild(document.createTextNode(cssText));
        node.nodeValue = cssText;
        return node;
    })(cssText);
};

var my_show_more_styles = {
		show_more_on : ".show-more {}",
		show_more_off : '.show-more { display: none;}'
	}

var CSS_show_more = setStyle(my_show_more_styles.show_more_off);

function showMore(turnOn)
{
	setStyle(turnOn ? my_show_more_styles.show_more_on : my_show_more_styles.show_more_off ,CSS_show_more);
}
//css related end

function doTableSearch(serachInput, tbl_id) {
	var searchText = serachInput.value;
	var targetTable = $id(tbl_id);
	var targetTableColCount;

	//Loop through table rows
	for (var rowIndex = 0; rowIndex < targetTable.rows.length; rowIndex++) {
		var rowData = '';

		//Get column count from header row
		if (rowIndex == 0) {
			targetTableColCount = targetTable.rows.item(rowIndex).cells.length;
			continue; //do not execute further code for header row.
		}

		//Process data rows. (rowIndex >= 1)
		for (var colIndex = 0; colIndex < targetTableColCount; colIndex++) {
			var cellText = getInnerText(targetTable.rows.item(rowIndex).cells.item(colIndex));
			rowData += cellText;
		}

		// Make search case insensitive.
		rowData = rowData.toLowerCase();
		searchText = searchText.toLowerCase();

		//If search term is not found in row data
		//then hide the row, else show
		if (rowData.indexOf(searchText) == -1)
		{
			targetTable.rows.item(rowIndex).style.display = 'none';
		}
		else
		{
			targetTable.rows.item(rowIndex).style.display = 'table-row';
		}
	}
	return false;
}

function getMyForm(elm)
{
	var parent = elm.parentNode;
	while(parent)
	{
		if(parent.nodeName == "FORM")
		{
			return parent;
		}
		parent = parent.parentNode;
	}
	return null;
}

function checkboxSet(self, input_name)
{
	self.form[input_name].value = self.checked ? 1 : 0;
}

//cookies
function createCookie(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

function eraseCookie(name) {
	createCookie(name,"",-1);
}

function getObjectKey(obj, key, default_value)
{
	return obj.hasOwnProperty(key) ? obj[key] :  (default_value !== undefined ? default_value : "");
}

function getDynContentElement()
{
	return $id("dyn-content");
}

function getScrollContentElement()
{
	return window;
}


function getTopBarMobile(title, without_back)
{
	var str =  "<header class='bar bar-nav'><h1 class='title'>";
	if(!without_back) str += "<button class='btn btn-link btn-nav pull-left' onclick='goBack()'><span class='icon icon-left-nav'></span>Cancel</button>";
	return str + title + "</h1></header>"
}

function getBottomBarMobile(without_back)
{
	return  without_back ? "" : "<header class='bar bar-tab'><button class='btn btn-link btn-nav pull-left' onclick='goBack()'><span class='icon icon-left-nav'></span>Cancel</button></header>";
}

function getTopBar(title, without_back)
{
	var str =  "<h4>" + title + "</h4>"
	if(!without_back) str += "<button class='btn' onclick='goBack()'>Cancel</button>";
	return str;
}

function getBottomBar(without_back)
{
	return  without_back ? "" : "<button class='btn' onclick='goBack()'>Cancel</button>";
}

//views cache start
function getScrollXY(node) {
	var scrOfX = 0, scrOfY = 0;
	if(node && (node != window))
	{
		scrOfX = node.scrollLeft;
		scrOfY = node.scrollTop;
	}
	else if( typeof( window.pageYOffset ) == 'number' ) {
		//Netscape compliant
		scrOfY = window.pageYOffset;
		scrOfX = window.pageXOffset;
	} else if( document.body && ( document.body.scrollLeft || document.body.scrollTop ) ) {
		//DOM compliant
		scrOfY = document.body.scrollTop;
		scrOfX = document.body.scrollLeft;
	} else if( document.documentElement && ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
		//IE6 standards compliant mode
		scrOfY = document.documentElement.scrollTop;
		scrOfX = document.documentElement.scrollLeft;
	}
	return [ scrOfX, scrOfY ];
}

var __edit_form_views = {};
var __list_form_views = {};
var __edit_form_after_creation = {};
	
function addCallbackToObjectReturnOld(obj, name, cb)
{
	var old_cb;
	if(obj.hasOwnProperty(name))
	{
		old_cb = obj[name];
	}
	obj[name] = cb;
	return old_cb;
}

function getCallbackFromObject(obj, name, cb_default)
{
	if(obj.hasOwnProperty(name))
	{
		return obj[name];
	}
	return cb_default;
}

function addEditFormViewMaker(name, cb)
{
	return addCallbackToObjectReturnOld(__edit_form_views, name, cb);
}

function getEditFormViewMaker(name, cb_default)
{
	return getCallbackFromObject(__edit_form_views, name, cb_default);
}

function addEditFormAfterCreation(name, cb)
{
	return addCallbackToObjectReturnOld(__edit_form_after_creation, name, cb);
}

function getEditFormAfterCreation(name, cb_default)
{
	return getCallbackFromObject(__edit_form_after_creation, name, cb_default);
}

function addListFormViewMaker(name, cb)
{
	return addCallbackToObjectReturnOld(__list_form_views, name, cb);
}

function getListFormViewMaker(name, cb_default)
{
	return getCallbackFromObject(__list_form_views, name, cb_default);
}

function ViewCache(node, dbtable, scrollXY)
{
	this.node = node;
	this.dbtable = dbtable;
	this.scrollXY = scrollXY;
	this.options = false;
	this.url = false;
	return this;
}

var __views_cache = [];
var __auto_id__ = 0;

function clearViewsCache() { getDynContentElement().innerText=''; return  __views_cache = [];}
function getViewsCacheTop() { return  __views_cache[__views_cache.length-1];}
function getViewsCacheSize() { return  __views_cache.length;}
function getCustomViewID() {return  __views_cache.length + 10;}
function getNewAutoID() {return  "auto_id_" + (++__auto_id__);}


function addNewView(req_url, dbtable, html, options, isReloading)
{
	var node = document.createElement('div');
	//node.classList.add("exclude");
	node.innerHTML = html;
	var dyn_elm = getDynContentElement();
	var dyn_scroll_elm = getScrollContentElement();
	var view = new ViewCache(node, dbtable, getScrollXY(dyn_scroll_elm));
	if(dyn_scroll_elm == window) dyn_scroll_elm.scrollTo(0,0);
	else 
	{
		dyn_scroll_elm.scrollTop = 0;
		dyn_scroll_elm.scrollLeft = 0;
	}
	view.url = req_url;
	view.options = options;
	var existing_views = __views_cache.length;
	if(existing_views) dyn_elm.replaceChild(node, getViewsCacheTop().node);
	else dyn_elm.appendChild(node);
	if(isReloading)
	{
		getViewsCacheTop().node = node;
		view.options.isReloading = null;
	}
	else
	{
		__views_cache.push(view);
	}
	try {
		var arr = node.getElementsByTagName('script')
		for (var n = 0; n < arr.length; n++)
		    eval(arr[n].innerText)//run script inside div		
	} catch(e){console.log(e);}
	return view;
}

function doReloadList()
{
	var view = getViewsCacheTop();
	if(!view.options)
		view.options = {};
	view.options.isReloading = true;
	loadLinkList(view.dbtable, view.options);
}

function goBack()
{
	if(__views_cache.length)
	{
		var old_view = __views_cache.pop();
		var dyn_elm = getDynContentElement();
		//save textarea sizes
		if(localStorage)
		{
			var tex_areas = dyn_elm.getElementsByTagName("textarea");
			for (var i = 0; i < tex_areas.length; i++) { 
				var ta = tex_areas[i];
				var rows_cols = ta.getAttribute("style"); 
				if ( rows_cols ) { 
					localStorage.setItem(the_textarea_style_storage_prefix + ta.id, rows_cols);
				}
			}
		}
		dyn_elm.replaceChild(getViewsCacheTop().node, old_view.node);
		var dyn_scroll_elm = getScrollContentElement();
		if(dyn_scroll_elm == window) dyn_scroll_elm.scrollTo(old_view.scrollXY[0], old_view.scrollXY[1]);
		else 
		{
			dyn_scroll_elm.scrollLeft = old_view.scrollXY[0];
			dyn_scroll_elm.scrollTop = old_view.scrollXY[1];
		}
	}
}

function appOnKeyDown(event) {
	if(event.keyCode===27) {
		//ESC key hide windows
		if(getViewsCacheSize() > 1) goBack();
		//return false;
	}
};
myAddEventListener(document, "keydown", appOnKeyDown);

//views cache end

function makeRequestByMethod(url, method, data, readyfn, encode_type, onRequestEnd_cb) {
	var httpRequest;
	if (window.XMLHttpRequest) { // Mozilla, Safari, ...
		httpRequest = new XMLHttpRequest();
	} else if (window.ActiveXObject) { // IE
	try {
		httpRequest = new ActiveXObject("Msxml2.XMLHTTP");
	} 
	catch (e) {
		try {
			httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
		} 
			catch (e) {}
		}
	}

	if (!httpRequest) {
		if(onRequestEnd_cb) onRequestEnd_cb();
		alert('Giving up :( Cannot create an XMLHTTP instance');
		return false;
	}
	httpRequest.onreadystatechange = function(){
		try {
			if (this.readyState === 4) {
				if (this.status === 200) {
					readyfn(this, url);
					if(onRequestEnd_cb) onRequestEnd_cb();
				} else {
					if(onRequestEnd_cb) onRequestEnd_cb();
					alert('There was a problem with the request.');
				}
			}
		}
		catch( e ) {
			if(onRequestEnd_cb) onRequestEnd_cb();
			console.log(e);
			alert('Caught Exception: ' + e.description);
		}		
	}
	httpRequest.open(method, url);
	if (encode_type) httpRequest.setRequestHeader("Content-type", encode_type);
	if(data) httpRequest.send(data);
	else httpRequest.send();
}

function makeGetRequest(url, readyfn) {
	makeRequestByMethod(url, "GET", false, readyfn)
}

var _escape_html_chars_re = /[ &<>"'`!@$%()=+{}[\]]/g;
function escapeHtml ( str ){
	if (str){
		return str.replace(_escape_html_chars_re, function(m) {
			var ch = m.charCodeAt(0).toString(16);
			return "&#x" + ch + ";";
		});
	}
	return str;
}

var _unescape_html_chars_re = /&[^;]+?;/g;
function unescapeHtml ( str ){
	if (str){
		return str.replace(_unescape_html_chars_re, function(m){
			if(m[5] == ";")
			{
				var hx = parseInt(m.substr(3, 2), 16);
				if(hx != NaN) return String.fromCharCode(hx);
			}
			if(m == "&lt;") return "<";
			if(m == "&bt;") return ">";
			if(m == "&amp;") return "&";
			if(m == "&quote;") return "\"";
			return "??";
		});
	}
}
 
function capitalize(s)
{
    return s && s[0].toUpperCase() + s.slice(1);
}

function mkLabel(lbl)
{
	lbl = lbl.replace(/_/g, " ");
	lbl = capitalize(lbl);
	return lbl;
}

function mkTableLabelLink(tbl)
{
	var the_label = mkLabel(tbl);
	var the_link = "<a href='#' class='td-link' onclick='showTableMetadata(\""+ tbl + "\")'>" + the_label + "</a>";
	return the_link;
}

function mkQueryString(query_params)
{
	var query_string = "?";
	var afterFirst = 0;
	for(var key in query_params)
	{
		if(afterFirst++) query_string += "&";
		query_string += key + "=" + query_params[key];
	}
	return query_string;
}

function callSelectRecord(self, dbtable, input_id, filter_by, filter_col_id, no_server_fill)
{
	var curr_view = getViewsCacheTop();
	var options = {};
	var filter_params = {};
	if(filter_by)
	{
		var myform = getMyForm(self);
		var filter_by_value = myform.elements[filter_by].value;
		filter_params["childs_table"] = filter_by_value;
		filter_params["id_col"] = (filter_col_id ? filter_col_id : filter_by);
	}
	filter_params["idstr"] = input_id;
	
	options.query_string = mkQueryString(filter_params);
	options.caller_dbtable = curr_view.dbtable;
	options.dbtable = dbtable;
	options.selected_id = $id(input_id).value;
	options.input_id = input_id;
	options.filter_by = filter_by;
	options.filter_col_id = filter_col_id;
	options.no_server_fill = no_server_fill;
	loadLinkList(dbtable, options);
	return false;
}

function showChildItems(childs_table, childs_id_col, the_id)
{
	var curr_view = getViewsCacheTop();
	if(curr_view)
	{
		var vop = curr_view.options;
		if(vop && vop.filter_column && curr_view.dbtable.endsWith("_filter_view"))
		{
			childs_id_col += "," + vop.filter_column;
			the_id += "," + vop.filter_value;
		}
	}
	var options = {"filter_column":childs_id_col, "filter_value":the_id};
	options.query_string = "?childs_table="  + the_id + "&id_col=" + childs_id_col;
	loadLinkList(childs_table, options);
	return false;		
}

function showFieldInfo(field_name)
{
	var curr_view = getViewsCacheTop();
	var dbtable = curr_view.dbtable;
	var path = the_api_base_uri + "__table_field_metadata_info?table=" + dbtable + "&field_name=" + field_name;
	doViewEditRecordByUrl(path, "__table_metadata_fields", null, {"on_back_do_no_loadList": true});
}

function showTableMetadata(tbl)
{
	var path = the_api_base_uri + "__tables_metadata_info?table=" + tbl;
	doViewEditRecordByUrl(path, "__tables_metadata");	
}

function doDeleteRecord(event, id)
{
	disabledEventPropagation(event);
	var answer = confirm("Are you sure to delete ?")
	if(answer)
	{
		var curr_view = getViewsCacheTop();
		var dbtable = curr_view.dbtable;
		makeGetRequest(the_api_base_uri + dbtable + "/" + id + ".json?_method=DELETE", function(http_req, req_url){
				//alert(this.responseText);
				var data = JSON.parse(http_req.responseText);
				if(data.request_result == "OK")
				{
					//doReloadList();
					doServerListReloadPage();
				}
				else alert(data.request_error);
			});
	}
	return false;
}

function getInputType(col_type)
{
	col_type = col_type.replace(/\([^\)]*\)/, "");
	switch(col_type.toLowerCase())
	{
		case "date":
			return "date";
		case "datetime":
			return "datetime";
			//return "datetime-local";
		case "boolean":
			return "checkbox";
		case "integer":
		case "numeric":
		case "decimal":
		case "double":
		case "real":
		case "float":
			return "number";
		case "blob":
			return "file";
		case "text":
			return "textarea";
		default:
			return "text";
	}
}

function mysubmit(btn)
{
	setWaitCursor();
	var the_form = btn.form;
	var the_form_elm_id = the_form.elements["id"];
	var the_id = (the_form_elm_id ? the_form_elm_id.value : "");
	var submit_action = the_form.elements["_submit_action_"].value;
	var submit_method = "POST";
	if(submit_action.indexOf("insert") == 0)
	{
		the_id = "";
		the_form.elements["_method"].value = submit_method = "PUT";
	}
	//order is important because we are changing form field values before clone bellow
	var formData = new FormData(the_form);
	var curr_view = getViewsCacheTop();
	var dbtable = curr_view.dbtable;
	var is_edit_only = curr_view.options ? curr_view.options.is_edit_only : false;
	var on_back_do_no_loadList = curr_view.options ? curr_view.options.on_back_do_no_loadList : false;
	var the_url = the_api_base_uri + dbtable + "/" + the_id + ".json";
	//console.log(the_url);
	makeRequestByMethod(the_url, submit_method, formData, function(http_req, req_url){
			setDefaultCursor();
			var data = JSON.parse(http_req.responseText);
			if(data.request_result == "OK")
			{
				if(data.changes == 0)  alert("Nothing changed, outdated record ?");
				else if(is_edit_only) alert("Form sent succesfully !");
				else if(!is_edit_only && (submit_action != "insert2"))
				{
					goBack();
					if(!on_back_do_no_loadList)
					{
						var isSearching = $id("le_searchTerm");
						doServerListReloadPage();
						//if(!isSearching || (isSearching.value == "")) doReloadList();
					}
				}
			}
			else alert(data.request_error);
		});
	return false;
}

function getSubmitActionSelect(isInsert)
{
	return "<input type='submit' value='Submit' onclick='return mysubmit(this);'> <select name='_submit_action_'><option value='insert'" +
		(isInsert ? " selected='1'" : "") +">Insert</option><option value='update'" + (!isInsert ?  " selected='1'" : "") + 
		">Update</option><option value='delete'>Delete</option><option value='insert2'>Keep Inserting</option></select>";
}

function defaultEditFormViewMaker(url, dbtable, the_filters, without_back, view, http_req, req_url)
{
	var auto_id = getNewAutoID();
	var custom_view_script_function = "custom_view_script_function_" + auto_id;
	view += "<script type='text/javascript'>" + custom_view_script_function + " = null;</script>";
	var data = JSON.parse(http_req.responseText);
	var columns = data.columns;
	var accepted_fields = data.accepted_fields;
	var column_types = data.column_types;
	var column_sizes = data.column_sizes;
	var col_count = columns.length;
	var extra_html = data.extra_html;
	var rows = data.rows;
	var with_child_entries = data.with_child_entries;
	var with_edit_links = data.with_edit_links;
	var record = (rows && rows.length) ? rows[0] : false;
	var the_id = record ? record[0] : "";
	var is_read_only = false;
	var isMultiPartData = false;
	var escape_func = escapeHtml;
	var filter_col_name = the_filters ? the_filters.filter_column : false;

	var with_child_entries_buttons = "";
	if(with_child_entries && the_id)
	{
		for(var ce=0, celen=with_child_entries.length; ce < celen; ++ce)
		{
			child_entry = with_child_entries[ce];
			with_child_entries_buttons += " <button onclick='showChildItems(\"" + child_entry.table_filtered_id_name + 
				"\", \"" + child_entry.table_filtered_field_id_name + "\", \"" + 
				the_id + "\");'>" + (child_entry.name || mkLabel(child_entry.table_filtered_id_name)) + "</button> ";
		}
	}
	view += with_child_entries_buttons;
	
	if(extra_html)
	{
		try
		{
			view += extra_html.replace(/\{\{([^\}]+)\}\}/g, function(m0, m1) {
				var idx = columns.indexOf(m1);
				if(idx >= 0) return encodeURIComponent(record[idx]).replace(/%20/g,'+');
				if(m1 == "_view_id_")  return getCustomViewID();
				if(m1 == "_auto_id_")  return auto_id;
				return m1;
			});
		} catch(e) {console.log(e);}
	}

	view += "<form id='" + auto_id + "' method='POST'><input type='hidden' name='_method' value='";
	view += (the_id ? "POST" : "PUT");
	view += "'><table  class='tbl-edit'>";
	for(var i=0; i  < col_count; ++i)
	{
		var col_name = columns[i];
		var col_name_escaped = escape_func(col_name);
		var form_input_id = col_name_escaped + ":" + i; //we need a delimiter because some field names can end with digits
		var label = mkLabel(col_name_escaped);
		var col_value = escape_func((record && the_id ? record[i] : (filter_col_name == col_name ? the_filters.filter_value :  "")));
		var has_link = with_edit_links ? with_edit_links[col_name] : false;
		var link_table_name = false;
		var isReadonly = !accepted_fields[col_name];
		var disabled = isReadonly ? " readonly=1" : "";
		
		view += "<tr><td onclick='showFieldInfo(\"" + col_name_escaped + "\")'>?</td>";
		if(has_link)
		{
			link_table_name = getObjectKey(has_link, "link_table_id_name");
			view += "<td class='td-link' onclick='return callSelectRecord(this, \"" + 
				link_table_name + "\", \"" + form_input_id + "\", \"" +
				getObjectKey(has_link, "filter_src_id_name") + "\", \"" +
				getObjectKey(has_link, "filter_dest_id_name") + "\"," +
				(getObjectKey(has_link, "no_server_fill") || 0) + ")'>";
		}
		else
		{
			view += "<td>"; 
		}
		view += label +":</td>";
		
		var input_type = (col_name == "notes") ? "textarea" : getInputType(column_types[i]);
		var isColSpan = false;
		//debug_print(col_name, ":", input_type, "\n");
		if(input_type == "checkbox")
		{
			//buf.write("<td onclick='document.getElementById(\"", form_input_id,"\").click()'>");
			view += "<td><label class='full-width'><input type='hidden' name='" + col_name_escaped + 
				"' value='" + col_value  + "'>\n" + 
				"<input type='checkbox'  onchange='checkboxSet(this, \"" +  col_name_escaped + 
				"\");' id='" + form_input_id + "'" + (col_value == "1" ? " checked='1'" : "") +
				disabled + "></label></td>";
		}
		else if(input_type == "textarea")
		{
			isColSpan = true;
			var rows_cols = "";
			if(localStorage)
			{
				rows_cols = localStorage.getItem(the_textarea_style_storage_prefix + form_input_id) || "";
				if(rows_cols)
				{
					rows_cols = " style='" + rows_cols + "' ";
				}
			}
			view += "<td colspan='2'><textarea name='" + col_name_escaped + "' id='" +
				form_input_id + "'" + rows_cols + disabled + ">" + (col_value || "") + "</textarea></td>";
		}
		else if(input_type == "file")
		{
			isColSpan = true;
			isMultiPartData = true;
			view += "<td colspan='2'><input type='" + input_type + "' name='" + col_name_escaped +
				"' id='" + form_input_id + "'" + disabled + ">";
			var col_size = column_sizes[i];
			if(col_size && !isReadonly)
			{
				view += "<br><label><input type='checkbox'  name='_x_delete_blob_" + 
					col_name_escaped + "'>Delete this attachemnt</label><br><a href='" +
					the_api_base_uri + dbtable + "/" + the_id + ".blob?field=" + col_name_escaped +
					"' target='_blank'>Download Attachment (" + col_size + " bytes)</a>";
			}
			view += "</td>";
		}
		else
		{
			var col_size = column_sizes[i];
			view +=  "<td><input type='" + input_type + "' name='" + col_name_escaped +
				"' value='" + (col_value || "") + "' id='" + form_input_id + "'" + disabled + (col_size > 14 ? (" style='width:20em;' ") : "") + "></td>";
		}
		
		if(link_table_name)
		{
			view +=  "<td id='edit_link" + i + "'>";
			if(col_value && col_value.length)
			{
				view += "<a href='#' class='td-link' onclick='return doViewEditRecord(" + col_value + ", {\"dbtable\":\"" + link_table_name + "\"})'>";
				var show_field = getObjectKey(has_link, "show_field_value", "");
				view +=  escape_func((show_field || "").toString()) + "</a>";
			}
		}
		else
		{
			if(!isColSpan) view +=  "<td>&nbsp;";
		}
		view += (isColSpan ? "</tr>\n": "</td></tr>\n");
	}
	view += "</table>";
	if(!is_read_only)
	{
		view += getSubmitActionSelect(the_id == "");
	}

	view += "</form><br>" + getBottomBar(without_back);
	view += with_child_entries_buttons;

	if(isMultiPartData)
	{
		view = view.replace("<form method='POST'>", "<form method='POST' enctype='multipart/form-data'>");
	}
	view += "<script type='text/javascript'>if(" + custom_view_script_function + ") " + custom_view_script_function + "();"
		+ custom_view_script_function + " = null;</script>";
	return view;
}


function doViewEditRecordByUrl(url, dbtable, the_filters, options)
{
	setWaitCursor();
	var without_back = getViewsCacheSize() < 1;
	var view = getTopBar(mkTableLabelLink(dbtable), without_back);
	makeGetRequest(url, function(http_req, req_url){
			setDefaultCursor();
			//alert(this.responseText);
			//first let's see if there is any custom view maker
			var view_maker = getEditFormViewMaker(dbtable, defaultEditFormViewMaker);
			view = view_maker(url, dbtable, the_filters, without_back, view, http_req, req_url);

			view = addNewView(req_url, dbtable, view);
			if(options)
			{
				if(!view.options) view.options = {};
				for(k in options) view.options[k] = options[k];
			}
			var afc_cb = getEditFormAfterCreation(dbtable);
			if(afc_cb) afc_cb();
		});
	return false;
}

function doViewEditRecord(id, options)
{
	var curr_view = getViewsCacheTop();
	if(curr_view && curr_view.options && id)
	{
		var select_input_id = getObjectKey(curr_view.options, "input_id", false);
		var no_server_fill = getObjectKey(curr_view.options, "no_server_fill", false);
		if(select_input_id)
		{
			var dbtable = curr_view.dbtable;
			//we are in select mode
			goBack();
			var elm = $id(select_input_id);
			if(elm)
			{
				elm.value = id;
				var elm_id_num = select_input_id.match(/\d+$/);
				var elm_id = "edit_link" + elm_id_num;
				var field_name = select_input_id.replace(/:\d+$/, "");
				
				if( (typeof customGetEditLink !== "undefined") && 
					customGetEditLink(curr_view.options.caller_dbtable, field_name, id, elm_id)) return;
				
				var getEditLinkName = function(the_id)
				{
					makeGetRequest(the_api_base_uri + "__get_edit_link?table=" + curr_view.options.caller_dbtable + 
							"&field_name=" + field_name + "&field_value=" + the_id, 
						function(http_req, req_url){
							//alert(this.responseText);
							var data = JSON.parse(http_req.responseText);
							if(field_name in data)
							{
								if(no_server_fill)
								{
									var elm = $id(select_input_id);
									if(elm) elm.value = data[field_name];
								}
								else
								{
									var elm = $id(elm_id);
									if(elm)
									{
										elm.innerHTML = data[field_name];
										
										//there is more fields to be filled ?
										//we decid this based on the existence of an "id" field
										if(data.hasOwnProperty("id"))
										{
											elm = $id(select_input_id);
											var the_form = elm.form;
											for (var prop in data) {
												// skip loop if the property is from prototype
												if(!data.hasOwnProperty(prop)) continue;
												//skip "id" and the field_name used to select
												if((prop == "id") || (prop == field_name)) continue;
												var the_input = the_form[prop];
												if(the_input)
												{
													the_input.value = data[prop];
												}
											}
										}
									}
									if(field_name == "link_table_id")
									{
										elm = $id(select_input_id);
										if(elm)
										{
											elm = elm.form.elements.show_table_id;
											if(elm)
											{
												elm.value = the_id;
												elm = $id("edit_link" + elm.id.match(/\d+$/));
												if(elm) elm.innerHTML = data[field_name];
											}											
										}
									}
								}
							}
							else alert("Field no found " + field_name + " :" + data.request_error);
						});
				};

				if(dbtable == "__table_metadata_fields")
				{
					makeGetRequest(the_api_base_uri + dbtable + "/" + id + ".json", 
							function(http_req, req_url){
								//alert(this.responseText);
								var data = JSON.parse(http_req.responseText);
								var row = data.rows[0];
								elm.value = row[data.columns.indexOf("field_id")];
								getEditLinkName(elm.value);
							});
				}
				else
				{
					getEditLinkName(id);
				}
			}
			return;
		}
	}
	var dbtable;
	var the_filter;
	if(options && options.hasOwnProperty("dbtable")) dbtable = options.dbtable;
	else
	{
		var vop = curr_view.options;
		if(vop) the_filter = {"filter_column":vop.filter_column, "filter_value":vop.filter_value};
		dbtable = curr_view.dbtable;
	}

	var the_filter_list_ext = "_filter_list_view";
	if(dbtable.endsWith(the_filter_list_ext))
	{
		var the_table_to_filter = dbtable.replace(the_filter_list_ext, "_list_view");
		
		var options = {"filter_column":"filter_ref_id", "filter_value":id};
		var vop = curr_view.options;
		if(vop && vop.filter_column)
		{
			options.filter_column += "," + vop.filter_column;
			options.filter_value += "," + vop.filter_value;
		}
		options.query_string = "?childs_table="  + options.filter_value + "&id_col=" + options.filter_column;
		loadLinkList(the_table_to_filter, options);
		return false;		
	}

	var view = getTopBar(dbtable);
	var the_url = the_api_base_uri + dbtable + "/" + id + ".json";

	if(dbtable.endsWith("_filter_view"))
	{
		var vop = curr_view.options;
		if(vop && vop.query_string)
		{
			the_url += vop.query_string;
			if(!options) options = vop;
		}
	}
	doViewEditRecordByUrl(the_url, dbtable, the_filter, options);
	return false;
}

function getListHtmlFromJsonStr(dbtable, options, the_json_str, no_back_button)
{
	//first let's see if there is any custom view maker
	var view_maker = getListFormViewMaker(dbtable, null);
	if(view_maker) return view_maker(dbtable, options, the_json_str);
	
	var isTableMetadata = (dbtable == "__tables_metadata_list_view") || (dbtable == "__tables_metadata");
	//console.log(dbtable);
	var data = JSON.parse(the_json_str);
	var without_back = no_back_button ? true : (getViewsCacheSize() < 1);
	var view = getTopBar(mkTableLabelLink(dbtable), without_back);
	var columns = data.columns;
	var col_count = columns.length;
	var col_map = [];
	for(var k=0; k < col_count; ++k)
	{
		//hide columns ending with "_id"
		if(columns[k].endsWith("_id")) continue;
		col_map.push(k);
	}

	col_count = col_map.length;

	var columns_select = "<select multiple='true' size='1'>";
	var columns_info = parseColumnsName(columns);
	var cols_format = columns_info.cols_format;
	var cols_name = columns_info.cols_name;
	var cols_title = columns_info.cols_title;
	var cols_align = columns_info.cols_align;
	view += "<style type='text/css'>";
	
	for(var k=0; k < col_count; ++k)
	{
		var the_col_idx = col_map[k];
		var the_align = cols_align[the_col_idx];
		if(the_align)
		{
			var col_num = k + 1;
			view += "table." +  dbtable + " tr td:nth-child(" + col_num + ") {text-align:" + the_align + " !important;} ";
		}
		var cname = cols_name[k];
		if(cname) columns_select += "<option value='" + k + "'>" + cname + "</option>";
	}
	columns_select += "</select>";
	var navigation_buttons = " <input type='submit' onclick='return doServerListPrevPage()' value='&lt;'> <input type='submit' onclick='return doServerListNextPage()' value='&gt;'> <input type='checkbox' onclick='return showMore(this.checked)'>";
	view += "</style><form><label>Search for <input type='text' id='le_searchTerm' class='search_box' onkeyup='doTableSearch(this, \"" + the_list_table_id +
		"\")' /></label> <input type='submit' onclick='return doServerListSearch()' value='Go'>  " + navigation_buttons + /*columns_select +*/ "<table class='tbl-list " +
		dbtable + "' id='" + the_list_table_id + "'><thead><tr>";

	for(var k=0; k < col_count; ++k)
	{
		var the_col_idx = col_map[k];
		var the_col_name = cols_title[the_col_idx];
		if(the_col_name == "?") the_col_name = cols_name[the_col_idx];
		view += "<th>" + mkLabel(the_col_name) + "</th>";
	}
	view += "<th><a href='#' onclick='return doViewEditRecord(0)'>New</a></th></tr></thead><tbody>";
	var record_selected_id = options ? getObjectKey(options, "selected_id", false) : false;
	var rows = data.rows;
	for(var i=0, len = rows.length; i < len; ++i)
	{
		var rec = rows[i];
		var the_id = rec[0];
		view += "<tr onclick='doViewEditRecord(" + the_id + ")' class='row-link";
		if(isTableMetadata)
		{
			if(rec[col_map[1]].charAt(0) == '_') view += " show-more";
		}
		if(record_selected_id && record_selected_id == the_id)
		{
			view += " row-selected' id='jump-tr'";
		}
		view += "'>";
		for(var k=0; k < col_count; ++k)
		{
			var the_col_idx = col_map[k];
			var col_value = rec[the_col_idx];
			var col_fmt = cols_format[the_col_idx];
			if(col_fmt) col_value = col_fmt(col_value);
			view += "<td>" + col_value + "</td>";
		}
		
		view += "<td><a href='#' onclick='doDeleteRecord(event, " + the_id + ");'>Delete</a></td></tr>";
	}
	view += "</tbody><tfoot><tr class='no-sort'>";
	for(var k=0; k < col_count; ++k)
	{
		view += "<td>&nbsp;</td>";
	}
	view += "<td><a href='#' onclick='return doViewEditRecord(0)'>New</a></td></tr></tfoot></table>" + getBottomBar(without_back) + navigation_buttons + "</form>";
	return view;
}

function doServerListSearchBase()
{
	setWaitCursor();	
	var search_str = $id("le_searchTerm");
	if(search_str) search_str = search_str.value;
	else search_str = "";
	//alert(search_str);
	var curr_view = getViewsCacheTop();
	//console.log(curr_view.options.query_string);
	var path = the_api_base_uri + curr_view.dbtable + "/list.json?search=" + encodeURIComponent(search_str);
	if(curr_view.options)
	{
		if(curr_view.options.list_page_no) path += "&list_page_no=" + curr_view.options.list_page_no;
		if(curr_view.options.query_string) path += "&" + curr_view.options.query_string.substring(1);
	}
	makeGetRequest(path, function(http_req, req_url){
			setDefaultCursor();
			//alert(http_req.responseText);
			var html = getListHtmlFromJsonStr(curr_view.dbtable, curr_view.options, http_req.responseText,
					(getViewsCacheSize() == 1))
			var node = document.createElement('div');
			node.innerHTML = html;
			var dyn_elm = getDynContentElement();
			dyn_elm.replaceChild(node, curr_view.node);
			curr_view.node = node;
			$id("le_searchTerm").value = search_str;
			window.scrollTo(0,0);
		});
	return false;
}

function getOptionsListPageNo()
{
	var curr_view = getViewsCacheTop();
	var options = curr_view.options;
	if(!options) curr_view.options = options = {};
	if(!options.list_page_no) options.list_page_no = 0;
	return options;
}

function doServerListSearch()
{
	var options = getOptionsListPageNo();
	options.list_page_no = 0;
	doServerListSearchBase();
	return false;
}

function doServerListPrevPage()
{
	var options = getOptionsListPageNo();
	if(options.list_page_no)
	{
		--options.list_page_no;
		//alert("List page = " + options.list_page_no);
		doServerListSearchBase();
	}
	return false;
}

function doServerListNextPage()
{
	var options = getOptionsListPageNo();
	var list_table = $id(the_list_table_id);
	if(list_table.tBodies[0].children.length)
	{
		++options.list_page_no;
		//alert("List page = " + options.list_page_no);
		doServerListSearchBase();
	}
	return false;
}

function doServerListReloadPage()
{
	var options = getOptionsListPageNo();
	var list_table = $id(the_list_table_id);
	doServerListSearchBase();
}

function loadLinkList(dbtable, options)
{
	//console.log(dbtable);
	setWaitCursor();
	var path = the_api_base_uri + dbtable + "/list.json";
	if(options && options.hasOwnProperty("query_string"))  path += options.query_string;
	
	makeGetRequest(path, function(http_req, req_url){
			setDefaultCursor();
			//alert(this.responseText);
			var view = getListHtmlFromJsonStr(dbtable, options, http_req.responseText);
			
			addNewView(req_url, dbtable, view, options, options && options.isReloading);

			var record_selected_id = options ? getObjectKey(options, "selected_id", false) : false;
			if(record_selected_id)
			{
				var elm = $id("jump-tr");
				if(elm) elm.scrollIntoView( true );
			}
		});
	return false;
}

function checkValidIdentifierValue(self)
{
	self.value = mkValidIdentifier(self.value);
}
