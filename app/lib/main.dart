import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

void main() {
  runApp(const CampusRepairApp());
}

class CampusRepairApp extends StatelessWidget {
  const CampusRepairApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '校园智慧报修',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primaryColor: const Color(0xFF2563EB),
        scaffoldBackgroundColor: const Color(0xFFFAFAF7),
      ),
      home: const WebViewPage(),
    );
  }
}

class WebViewPage extends StatefulWidget {
  const WebViewPage({super.key});

  @override
  State<WebViewPage> createState() => _WebViewPageState();
}

class _WebViewPageState extends State<WebViewPage> {
  InAppWebViewController? _controller;
  double _progress = 0;

  // 套壳加载的网页地址（已部署的可登录报修系统）
  final WebUri _initialUrl = WebUri('https://beelzebub.top/campusrepair/');

  @override
  Widget build(BuildContext context) {
    // 拦截系统返回键：优先让 WebView 后退，而不是直接退出 App
    return PopScope(
      canPop: false,
      onPopInvoked: (didPop) async {
        if (didPop) return;
        if (_controller != null && await _controller!.canGoBack()) {
          _controller!.goBack();
        } else {
          SystemNavigator.pop(); // WebView 无可后退页面时退出 App
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: Column(
            children: [
              // 顶部加载进度条
              if (_progress < 1.0)
                LinearProgressIndicator(
                  value: _progress,
                  minHeight: 3,
                  backgroundColor: const Color(0xFFEEF2FF),
                  valueColor:
                      const AlwaysStoppedAnimation<Color>(Color(0xFF2563EB)),
                ),
              Expanded(
                child: InAppWebView(
                  initialUrlRequest: URLRequest(url: _initialUrl),
                  initialSettings: InAppWebViewSettings(
                    javaScriptEnabled: true,
                    domStorageEnabled: true, // 关键：让网页 localStorage 可用，保持登录态(token)
                    databaseEnabled: true,
                    cacheEnabled: true,
                    useShouldOverrideUrlLoading: false,
                    mediaPlaybackRequiresUserGesture: false,
                    supportZoom: false,
                  ),
                  onWebViewCreated: (controller) => _controller = controller,
                  onProgressChanged: (controller, progress) {
                    setState(() => _progress = progress / 100);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
