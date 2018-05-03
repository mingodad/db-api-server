#!/usr/bin/env squilu

local globals = getroottable();
//foreach(k,v in globals) print(k,v);

//add custom web app handlers
function addExtraCodeToUserCallbackSetup()
{
	return [==[
function addExtraWebAppCode(self)
{
	local globals = getroottable();
	/*
	if(AT_DEV_DBG || !table_rawget(globals, "MyWebAppLoaded", false)) {
		self.dofile(APP_CODE_FOLDER + "/webapp.nut");
	}
	*/
	if(AT_DEV_DBG || !table_rawget(globals, "WebDBApiLoaded", false)) {
		self.dofile(APP_CODE_FOLDER + "/db-api-server.nut");
	}

	if(AT_DEV_DBG || !table_rawget(globals, "UserCodeLoaded", false)) {
		auto user_code_fn = APP_RUN_FOLDER + "/db-api-user-code.nut";
		if(existsfile(user_code_fn)) self.dofile(user_code_fn);
	}
}
	]==];
}

WIN32 <- os.getenv("WINDIR") != null;
ANDROID <- table_rawget(globals, "jniLog", false);

local function getAppCodeFolder(){
	if(table_rawget(globals, "jniLog", false)) return "/sdcard/db-api";
	if(table_rawget(globals, "WIN32", false)) return ".";
	return os.getenv("PWD");
}

auto app_code_folder = ANDROID ? "/sdcard/db-api" : "/home/mingo/bin/squiluLib";
auto app_run_folder = ANDROID ? "/sdcard/db-api" : os.getenv("PWD");
APP_CODE_FOLDER <- (vargv.len() > 1) ? vargv[1] : app_code_folder;
APP_RUN_FOLDER <- (vargv.len() > 2) ? vargv[2] : app_run_folder;
auto http_ports = (vargv.len() > 3) ? vargv[3] : "8086,8087s";
AT_DEV_DBG <- (vargv.len() > 4) ? (vargv[4] == "true") : false;
auto web_root = (vargv.len() > 5) ? vargv[5] : APP_CODE_FOLDER + "/s";

VIEW_MD5_PASSWORD <- md5("viewOnly:r.unolotiene.com:3ñYCº9t;ñ-O");
EDIT_MD5_PASSWORD <-  md5("Only4me:r.unolotiene.com:?dk/2;+º<88");
GLOBAL_PASSWORD_DOMAIN <- "dev.unolotiene.com";
GLOBAL_MD5_PASSWORD <-  md5("human:" + GLOBAL_PASSWORD_DOMAIN + ":ak/772,<9+sT");
loadfile(APP_CODE_FOLDER + "/sq-server.nut")();
if (table_get(globals, "appServerStart", false)) appServerStart(http_ports, web_root);

if(WIN32 || !table_get(os, "signal_str2int", false))
{
	stdin.readn('c');
}
else
{
	local SIGINT = os.signal_str2int("SIGINT");
	os.signal(SIGINT);

	local SIGQUIT = os.signal_str2int("SIGQUIT");
	os.signal(SIGQUIT);

	local SIGTERM = os.signal_str2int("SIGTERM");
	os.signal(SIGTERM);

	local SIGALRM = os.signal_str2int("SIGALRM");
	os.signal(SIGALRM);

	local SIGHUP = os.signal_str2int("SIGHUP");
	os.signal(SIGHUP);

	local run_loop = true;
	while(run_loop) {
		local signal_received = os.get_signal_received();
		if(signal_received) {
			local sig_name = os.signal_int2str(signal_received);
			switch(sig_name) {
				case "SIGINT":
				case "SIGQUIT":
				case "SIGTERM":
					run_loop = false;
				break;
				case "SIGALRM":
					run_loop = false;
				break;
				case "SIGHUP":
					run_loop = false;
				break;
			}
		}
		if(run_loop) {
			os.sleep(100);
		} else {
			print(signal_received, os.signal_int2str(signal_received));
		}
	}
}
os.sleep(100);
if (table_get(globals, "appServerStop", false)) appServerStop();
