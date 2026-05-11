package com.represt.app;

import android.content.pm.PackageManager;
import android.content.pm.InstallSourceInfo;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppDistribution")
public class AppDistributionPlugin extends Plugin {
    @PluginMethod
    public void getInstallSource(PluginCall call) {
        JSObject result = new JSObject();
        String installerPackageName = getInstallerPackageName();
        String channel = "com.android.vending".equals(installerPackageName) ? "play" : "apk";

        result.put("channel", channel);
        result.put("installerPackageName", installerPackageName);
        call.resolve(result);
    }

    private String getInstallerPackageName() {
        PackageManager packageManager = getContext().getPackageManager();
        if (packageManager == null) {
            return null;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                InstallSourceInfo installSourceInfo = packageManager.getInstallSourceInfo(getContext().getPackageName());
                if (installSourceInfo != null) {
                    return installSourceInfo.getInstallingPackageName();
                }
                return null;
            }

            return packageManager.getInstallerPackageName(getContext().getPackageName());
        } catch (Exception ignored) {
            return null;
        }
    }
}
