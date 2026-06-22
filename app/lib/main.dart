import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

const campusRepairAsset = 'assets/www/index.html';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
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
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          surface: const Color(0xFFFAFAF7),
        ),
        scaffoldBackgroundColor: const Color(0xFFFAFAF7),
        useMaterial3: true,
      ),
      home: const CampusRepairWebView(),
    );
  }
}

class CampusRepairWebView extends StatefulWidget {
  const CampusRepairWebView({super.key});

  @override
  State<CampusRepairWebView> createState() => _CampusRepairWebViewState();
}

class _CampusRepairWebViewState extends State<CampusRepairWebView> {
  InAppWebViewController? _controller;
  double _progress = 0;
  bool _pageReady = false;
  bool _loadFailed = false;

  Future<void> _handleBack() async {
    final controller = _controller;
    if (controller != null && await controller.canGoBack()) {
      await controller.goBack();
      return;
    }
    SystemNavigator.pop();
  }

  Future<void> _retry() async {
    setState(() {
      _loadFailed = false;
      _pageReady = false;
      _progress = 0;
    });
    await _controller?.loadFile(assetFilePath: campusRepairAsset);
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (!didPop) {
          await _handleBack();
        }
      },
      child: Scaffold(
        body: AnnotatedRegion<SystemUiOverlayStyle>(
          value: SystemUiOverlayStyle.dark.copyWith(
            statusBarColor: const Color(0xFFFAFAF7),
            systemNavigationBarColor: const Color(0xFFFAFAF7),
          ),
          child: SafeArea(
            child: Stack(
              children: [
                Positioned.fill(
                  child: InAppWebView(
                    initialFile: campusRepairAsset,
                    initialSettings: InAppWebViewSettings(
                      javaScriptEnabled: true,
                      domStorageEnabled: true,
                      databaseEnabled: true,
                      cacheEnabled: true,
                      mediaPlaybackRequiresUserGesture: false,
                      supportZoom: false,
                      transparentBackground: false,
                      allowFileAccessFromFileURLs: true,
                    ),
                    onWebViewCreated: (controller) => _controller = controller,
                    onLoadStart: (controller, url) {
                      if (mounted) {
                        setState(() {
                          _loadFailed = false;
                          _pageReady = false;
                        });
                      }
                    },
                    onLoadStop: (controller, url) {
                      if (mounted) {
                        setState(() {
                          _pageReady = true;
                          _progress = 1;
                        });
                      }
                    },
                    onProgressChanged: (controller, progress) {
                      if (mounted) {
                        setState(() => _progress = progress / 100);
                      }
                    },
                    onReceivedError: (controller, request, error) {
                      if ((request.isForMainFrame ?? false) && mounted) {
                        setState(() {
                          _loadFailed = true;
                          _pageReady = false;
                        });
                      }
                    },
                  ),
                ),
                if (!_pageReady && !_loadFailed)
                  Positioned.fill(
                    child: ColoredBox(
                      color: const Color(0xFFFAFAF7),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 52,
                              height: 52,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(14),
                                gradient: const LinearGradient(
                                  colors: [
                                    Color(0xFF2563EB),
                                    Color(0xFF7C3AED),
                                  ],
                                ),
                              ),
                              child: const Icon(
                                Icons.home_repair_service_rounded,
                                color: Colors.white,
                                size: 28,
                              ),
                            ),
                            const SizedBox(height: 18),
                            Text(
                              '校园智慧报修',
                              style: Theme.of(context).textTheme.titleLarge
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 18),
                            SizedBox(
                              width: 180,
                              child: LinearProgressIndicator(
                                value: _progress > 0 ? _progress : null,
                                minHeight: 3,
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                if (_loadFailed)
                  Positioned.fill(
                    child: ColoredBox(
                      color: const Color(0xFFFAFAF7),
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.error_outline_rounded,
                                size: 52,
                                color: Color(0xFF52525B),
                              ),
                              const SizedBox(height: 18),
                              Text(
                                '应用页面加载失败',
                                textAlign: TextAlign.center,
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                '请重新加载内置页面',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Color(0xFF71717A)),
                              ),
                              const SizedBox(height: 22),
                              FilledButton.icon(
                                onPressed: _retry,
                                icon: const Icon(Icons.refresh_rounded),
                                label: const Text('重新加载'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
