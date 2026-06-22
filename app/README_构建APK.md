# CampusRepair · Flutter 套壳 APK 构建说明

把已经部署好的可登录网页（https://beelzebub.top/campusrepair/）用 Flutter WebView 套壳，打成能装手机、有图标的 Android APK。

> 在**你自己的笔记本**上做（已有 CCTT 的 Flutter 环境）。服务器内存太小、无 Android SDK，不适合构建。

---

## 一、生成工程脚手架

```bash
flutter create campusrepair_app
cd campusrepair_app
```

## 二、替换 / 修改 3 个文件

### 1. `lib/main.dart`
用本包里的 `lib/main.dart` **整个替换**掉脚手架生成的那个（全屏 WebView 加载网页 + 加载进度条 + 返回键后退）。

### 2. `pubspec.yaml` — 加依赖
在 `dependencies:` 下加一行（注意缩进对齐）：

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_inappwebview: ^6.1.5     # ← 加这一行
```

### 3. `android/app/src/main/AndroidManifest.xml` — 加网络权限 + 改应用名
在 `<manifest>` 标签内、`<application>` **上面**加一行联网权限：

```xml
<uses-permission android:name="android.permission.INTERNET"/>
```

把 `<application` 标签的 `android:label` 改成中文应用名：

```xml
<application
    android:label="校园智慧报修"
    ...>
```

> 用的是 https，无需 `usesCleartextTraffic`。

## 三、构建 APK

```bash
flutter pub get
flutter build apk --release
```

产物在：
```
build/app/outputs/flutter-apk/app-release.apk
```

把这个 `app-release.apk` 传到手机安装即可（安装时允许"未知来源"）。

---

## 四、效果

- 手机桌面出现「校园智慧报修」图标，点开全屏运行，看起来就是个 App
- 打开即是登录页，用 student / admin / worker（密码 123）登录
- 登录态（token）存在 WebView 的 localStorage 里，**关掉重开仍保持登录**（`domStorageEnabled: true` 起的作用）
- 系统返回键 = 网页后退

## 五、可选美化

- **换应用图标**：用 `flutter_launcher_icons` 包，把项目的蓝紫渐变 logo 设为图标
- **换启动图**：`flutter_native_splash` 包做暖白底 + logo 的启动页
- 需要的话告诉我，我把这两个配置也写好给你

---

## 常见问题

| 问题 | 解决 |
|---|---|
| 构建报 minSdk 错误 | `android/app/build.gradle` 里 `minSdkVersion` 设为 21 或以上 |
| 白屏打不开 | 检查手机能否访问 https://beelzebub.top/campusrepair/ ；确认 INTERNET 权限加了 |
| 登录后重开掉登录 | 确认 main.dart 里 `domStorageEnabled: true`（本包已设好） |
| Gradle 下载慢 | 配国内镜像（阿里云 maven），和你 CCTT 项目一样 |
