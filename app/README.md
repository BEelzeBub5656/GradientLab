# CampusRepair Flutter App

校园智慧报修 Android 演示应用。页面、演示数据和项目设计图均内置在 APK 中，不依赖远程服务器，适合课堂展示和大作业验收。

## 功能

- 学生：登录、提交报修、查看工单、确认完成并评价
- 管理员：查看统计、筛选工单、分派维修人员
- 维修人员：查看任务、开始处理、标记完成
- 数据保存在 WebView `localStorage`，关闭应用后仍可继续演示
- 深色模式下使用固定浅色启动页，避免 WebView 初始化期间出现黑屏

## 测试账号

| 角色 | 用户名 | 密码 |
|---|---|---|
| 学生 | `student` | `123` |
| 管理员 | `admin` | `123` |
| 维修人员 | `worker` | `123` |

## 验证

```bash
flutter pub get
flutter analyze
flutter test
node --test test/offline_api_test.js
flutter build apk --release
```

APK 输出位置：`build/app/outputs/flutter-apk/app-release.apk`。
