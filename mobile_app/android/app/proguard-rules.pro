# Add project specific ProGuard rules here.
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*

# Capacitor
-keep public class com.getcapacitor.** { *; }
-keep class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin
-keep public class * extends com.getcapacitor.BridgeActivity
-keep class * extends com.getcapacitor.Plugin { *; }
-keep interface com.getcapacitor.PluginMethod { *; }

# WebView
-keepclassmembers class fqcn.of.javascript.interface.for.webview {
   public *;
}
