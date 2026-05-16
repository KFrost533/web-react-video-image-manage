# Screenshots Guide

## 推奨画像サイズと配置

### Screenshots フォルダ
- `frontend-demo.png` - React アプリの動作画面（1200x800px推奨）
- `backend-api.png` - FastAPI SwaggerUI画面（1200x800px推奨）  
- `git-hook-demo.png` - pre-pushフック実行画面（800x600px推奨）
- `build-process.gif` - ビルドプロセスのアニメーション（任意サイズ）

### Architecture フォルダ
- `system-overview.png` - システム全体構成図（1400x1000px推奨）
- `data-flow.png` - データフロー図（1200x800px推奨）

### Roadmap フォルダ  
- `timeline.png` - 開発タイムライン（1600x900px推奨）
- `feature-mockup.png` - 次期機能のモックアップ（1200x800px推奨）

## 画像の撮影・作成方法

### スクリーンショット撮影
1. Windows: `Win + Shift + S`
2. 高DPI環境では2倍解像度で撮影
3. PNG形式で保存（透明度対応）

### 図表作成ツール
- Draw.io (無料) - system diagrams
- Figma (無料版) - UI mockups  
- PowerPoint - simple charts

## HTML での使用例
```html
<img src="images/screenshots/frontend-demo.png" 
     alt="Frontend Demo" 
     class="screenshot">
```