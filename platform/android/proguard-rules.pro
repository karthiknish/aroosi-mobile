
# Aroosi App Proguard Rules

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }


# Keep image picker classes
-keep class com.imagepicker.** { *; }

# Keep biometric classes
-keep class androidx.biometric.** { *; }

# Keep notification classes
-keep class com.google.firebase.** { *; }

# Keep networking classes
-keep class okhttp3.** { *; }
-keep class retrofit2.** { *; }

# Keep model classes (adjust package names as needed)
-keep class com.aroosi.mobile.models.** { *; }

# Remove logging in release builds
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Keep enum classes
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelable classes
-keep class * implements android.os.Parcelable {
  public static final android.os.Parcelable$Creator *;
}
