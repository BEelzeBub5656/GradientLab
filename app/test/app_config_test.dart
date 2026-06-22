import 'package:campus_repair/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('loads the bundled CampusRepair page', () {
    expect(campusRepairAsset, 'assets/www/index.html');
  });
}
