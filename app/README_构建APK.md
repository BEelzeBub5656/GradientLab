# CampusRepair APK 构建说明

## 环境

- Flutter 3.41 或兼容稳定版
- Android SDK 36
- JDK 21

## 构建

```bash
cd app
flutter pub get
flutter analyze
flutter test
node --test test/offline_api_test.js
flutter build apk --release
```

产物：

```text
app/build/app/outputs/flutter-apk/app-release.apk
```

## 离线架构

- Flutter 使用 `flutter_inappwebview` 加载 `assets/www/index.html`
- `assets/www/offline_api.js` 在浏览器端实现与 Express 后端一致的登录、工单、派单、状态流转、评价和统计接口
- 演示数据持久化到 `localStorage`
- `CampusRepair.html` 仍保留在线 Web 版本，并兼容后端返回的中文工单状态

## 黑屏修复

1. 不再把 APK 可用性绑定到远程域名和 TLS 状态。
2. WebView 初始化期间显示浅色品牌加载页。
3. Android 日间和夜间启动主题均固定为浅色背景。
4. 主页面加载失败时显示可重试的错误界面。

安装新版本前若设备仍显示旧页面，可卸载旧 APK 后重新安装。
