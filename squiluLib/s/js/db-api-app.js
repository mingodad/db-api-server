// Put event listeners into place
function setupHtmlVideo(video_elm_id) {
	// Grab elements, create settings, etc.
	//var canvas = document.getElementById(canvas_id),
	//	context = canvas.getContext("2d"),
	var	video = document.getElementById(video_elm_id),
		videoObj = { "video": true },
		errBack = function(error) {
			console.log("Video capture error: ", error.code); 
		};

	// Put video listeners into place
	if(navigator.getUserMedia) { // Standard
		navigator.getUserMedia(videoObj, function(stream) {
			video.src = stream;
			video.play();
		}, errBack);
	} else if(navigator.webkitGetUserMedia) { // WebKit-prefixed
		navigator.webkitGetUserMedia(videoObj, function(stream){
			video.src = window.webkitURL.createObjectURL(stream);
			video.play();
		}, errBack);
	}
	else if(navigator.mozGetUserMedia) { // Firefox-prefixed
		navigator.mozGetUserMedia(videoObj, function(stream){
			video.src = window.URL.createObjectURL(stream);
			video.play();
		}, errBack);
	}
}

// Converts canvas to an image
function convertCanvasToImage(canvas) {
	image.src = canvas.toDataURL("image/png");
	return image;
}

function takePhoto(video_elm_id)
{
	var	video = document.getElementById(video_elm_id)
	var canvas =document.createElement('canvas');  
	var ctx = canvas.getContext('2d');  
	var cw = video.width;  
	var ch = video.height;  
	ctx.fillStyle = "#ffffff";  
	ctx.fillRect(0, 0, cw, ch);  
	ctx.drawImage(video, 0,0, cw,ch);
	var imgData =canvas.toDataURL("image/png");
	//var data = imgData.substr(22);
	return imgData;
	//$image = base64_decode( str_replace('data:image/jpeg;base64,', '',$data);
}

function showContentFor(tbl_view)
{
	var elm = $id("dyn-content");
	clearViewsCache();
	var done = false;
	var content_view_ary = tbl_view.split(":");
	if(content_view_ary.length > 1)
	{
		if(content_view_ary[0] == "edit")
		{
			done = true;
			doViewEditRecord(0, {"dbtable": content_view_ary[1], "is_edit_only": true});
		}
	}
	if(!done) loadLinkList(tbl_view);
}

var main_navigation_items = [];
var main_navigation_items_cols = null;

function getMainNavigationItensCols(mdata)
{
	return {
		"id" : mdata.columns.indexOf("id"),
		"label" : mdata.columns.indexOf("label"),
		"parent_id" : mdata.columns.indexOf("parent_id"),
		"sequence" : mdata.columns.indexOf("sequence"),
		"table_view_id" : mdata.columns.indexOf("table_view")
	};
}

function sortMenuTree(mdata)
{
	main_navigation_items_cols = getMainNavigationItensCols(mdata);
	var id_col = main_navigation_items_cols.id;
	var label_col = main_navigation_items_cols.label;
	var parent_id_col = main_navigation_items_cols.parent_id;
	var sequence_col = main_navigation_items_cols.sequence;
	
	var rows = mdata.rows;
	var rows_by_parent = {};
	for(var i=0, len=rows.length; i < len; ++i)
	{
		var row = rows[i];
		var parent = row[parent_id_col] || "0";
		var by_parent = rows_by_parent[parent];
		if(!by_parent)
		{
			by_parent = [];
			rows_by_parent[parent] = by_parent;
		}
		by_parent.push(row);
	}
	//sort each individual by_parent array
	for(idx in rows_by_parent)
	{
		var ary = rows_by_parent[idx];
		ary.sort(function(a,b){
				var result = parseInt(a[sequence_col]) - parseInt(b[sequence_col]);
				if(result == 0)
				{
					return a[label_col].localeCompare(b[label_col]);
				}
				return result;
			});
	}

	var rows_sorted = [];
	var root = rows_by_parent["0"];
	if(!root) return rows;
	var populateSorted = function(the_array){
		for(idx in the_array)
		{
			var ary = the_array[idx];
			rows_sorted.push(ary);
			var childs_ary = rows_by_parent[ary[id_col]];
			if(childs_ary) populateSorted(childs_ary);
		}
	};
	populateSorted(root);
	main_navigation_items = rows_sorted;
	return rows_sorted;
}

function showContentFor(mn_idx)
{
	var table_view_id_col = main_navigation_items_cols.table_view_id;
	var label_col = main_navigation_items_cols.label;
	var menu_entry, content_view;
	var isMenuIdx = (typeof mn_idx == "number") ;
	if(isMenuIdx) 
	{
		var menu_entry =  main_navigation_items[mn_idx];
		content_view = menu_entry[table_view_id_col];
	}
	else content_view = mn_idx;
	
	var elm = $id("dyn-content");
	clearViewsCache();
	if(content_view)
	{
		var done = false;
		var content_view_ary = content_view.split(":");
		if(content_view_ary.length > 1)
		{
			if(content_view_ary[0] == "edit")
			{
				done = true;
				doViewEditRecord(0, {"dbtable": content_view_ary[1]});
			}
		}
		if(!done) loadLinkList(content_view);
	}
	else
	{
		var content = "<h2>" + (isMenuIdx ? menu_entry[label_col] : content_view) + "</h2>";
		elm.innerHTML = content;
	}
}

function createSecondaryMenu(mn_idx)
{
	var menu = "";
	var id_col = main_navigation_items_cols.id;
	var parent_id_col = main_navigation_items_cols.parent_id;
	var label_col = main_navigation_items_cols.label;
	var table_view_id_col = main_navigation_items_cols.table_view_id;
	var menu_entry =  main_navigation_items[mn_idx];
	var top_menu_id = menu_entry[id_col];
	var menu_len = main_navigation_items.length;
	menu += "<h4>" + menu_entry[label_col] + "</h4>\n";
	
	var idx_loop = (mn_idx + 1);
	
	var genChilds = function(parent_menu_id)
	{
		var has_child = false;
		while(idx_loop < menu_len)
		{
			var sub_menu = main_navigation_items[idx_loop];
			if(sub_menu[parent_id_col] != parent_menu_id) break; //only childs
			if(!has_child)
			{
				has_child = true;
				menu += "<ul>\n";
			}
			menu += "<li><a onclick='showContentFor(" + idx_loop + ")'>" + sub_menu[label_col];
			++idx_loop;
			genChilds(sub_menu[id_col]);
			menu += "</a></li>\n";
		}
		if(has_child) menu += "</ul>\n";
	};
	genChilds(top_menu_id);
	var elm = $id("secondary-menu");
	elm.innerHTML = menu;
	//showContentFor(mn_idx, 0, 0);
}

function generateTopMenu()
{
	var label_col = main_navigation_items_cols.label;
	var parent_id_col = main_navigation_items_cols.parent_id;
	var rows = main_navigation_items;
	var rows_len = rows.length;
	var app_menu_all_url =  window.location.href;
	if(app_menu_all_url.indexOf("#"))
	{
		app_menu_all_url = app_menu_all_url.substr(0, app_menu_all_url.indexOf("#"));
	}
	var menu = "<ul>\n<li><a href='" + app_menu_all_url + "'>All</a></li>\n";
	for(var i=0; i < rows_len; ++i)
	{
		var item = rows[i];
		if(item[parent_id_col]) continue; //skip non root entries
		menu += "<li><a onclick='createSecondaryMenu(" + i + ")'>" + item[label_col] + "</li>\n";
	}
	menu += "</a></ul>\n";
	return menu;
}

function generateMenuTree()
{
	var id_col = main_navigation_items_cols.id;
	var label_col = main_navigation_items_cols.label;
	var parent_id_col = main_navigation_items_cols.parent_id;
	var parent_id_col = main_navigation_items_cols.parent_id;
	var table_view_col_id = main_navigation_items_cols.table_view_id;

	var html = "<h3><a onclick='showContentFor(\"__app_menu\")'>Menu</a></h3>";
	var rows = main_navigation_items;
	var rows_len = rows.length;
	var generateLI = function(idx, parent_id, prev_parent_id)
	{
		var has_child = false;
		var done = false;
		var count = 0;
		for(; idx < rows_len; ++idx)
		{
			var row = rows[idx];
			var row_parent_id = row[parent_id_col];
			if( (row_parent_id == parent_id) || (row_parent_id < parent_id) )break;
			if(!has_child)
			{
				has_child = true;
				html += "<ul>";
			}
			html += "<li>";
			var hasLink = row[table_view_col_id];
			if(hasLink) html += "<a onclick='showContentFor(" + idx + ")'>"
			html += row[label_col];
			if(hasLink) html += "</a>"
			
			var next_idx = idx + 1;
			if(next_idx < rows_len)
			{
				var next_row = rows[next_idx];
				var next_parent_id = next_row[parent_id_col];
				done = next_parent_id == prev_parent_id;
				if(!done && (next_parent_id != parent_id))
				{
					var call_count = generateLI(next_idx, row_parent_id, parent_id);
					if(call_count)
					{
						idx += call_count;
						count += call_count;
					}
				}
			}
			html += "</li>";
			++count
			if(done) break;
		}
		if(has_child) html += "</ul>";
		return count;
	};
	generateLI(0, null, null);
	return html;
}

function myTakePhotoOnSubmit(btn)
{
	var form = btn.form;
	form.elements.photo.value = takePhoto("video_cam");
	return true;
}

function formEditAccessKeypad(url, dbtable, the_filters, without_back, view, http_req, req_url)
{
	var view = defaultEditFormViewMaker(url, dbtable, the_filters, without_back, view, http_req, req_url);
	//view = view.replace("<form method='POST'>", "<form method='POST'><input type='hidden' name='photo'>");
	//view = view.replace("return mysubmit(this)", "myTakePhotoOnSubmit(this)");
	view += "<video id='video_cam' width='320' height='240' autoplay></video>";
/*
var view ="";
view += "<form method=\"POST\" action=\"\/api\/fac\/access_keypad\/.json\">";
view += "	<input type=\"hidden\" name=\"_method\" value=\"PUT\">";
view += "	<input type=\"hidden\" name=\"photo\">";
view += "	<table class=\"tbl-edit\">";
view += "	<tbody>";
view += "	<tr><td onclick=\"showFieldInfo('access_code')\">?<\/td><td>Access code:<\/td><td><input type=\"text\" name=\"access_code\" value=\"\" id=\"access_code0\"><\/td><td>&nbsp;<\/td><\/tr>";
view += "	<tr><td onclick=\"showFieldInfo('access_passwd')\">?<\/td><td>Access passwd:<\/td><td><input type=\"text\" name=\"access_passwd\" value=\"\" id=\"access_passwd1\"><\/td><td>&nbsp;<\/td><\/tr>";
view += "	<\/tbody>";
view += "	<\/table><input type=\"submit\" value=\"Submit\" onclick=\"return myTakePhotoOnSubmit(this);\"> ";
view += "	<select name=\"_submit_action_\"><option value=\"insert\" selected=\"1\">Insert<\/option><option value=\"update\">Update<\/option><option value=\"delete\">Delete<\/option><option value=\"insert2\">Keep Inserting<\/option><\/select>";
view += "	<\/form>";
view += "	<br>";
view += "	<video id='video_cam' width='320' height='240' autoplay><\/video>";
*/
	return view;
}

function customLoadTheApi()
{
	var path = the_api_base_uri + "__app_menu/list.json";
	makeGetRequest(path, function(http_req, req_url){
			//alert(http_req.responseText);
			var data = JSON.parse(http_req.responseText);
			sortMenuTree(data);
			var menu_html = generateTopMenu();
			var menu = $id("main-menu");
			menu.innerHTML = menu_html;
			menu_html = generateMenuTree();
			menu = $id("secondary-menu");
			menu.innerHTML = menu_html;
		});
	addEditFormViewMaker("access_keypad", formEditAccessKeypad);
	addEditFormAfterCreation("access_keypad", function(){setupHtmlVideo('video_cam');});
	//loadTheApi("/api/odoo/");
}
