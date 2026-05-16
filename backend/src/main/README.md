# File Automation Scripts - Java Implementation

このディレクトリには、Pythonスクリプト（スクリプト実行 + FastAPI ルート）の Java 再実装が含まれています。

**ハイライト:**
- ✅ Maven ベースのプロジェクト管理
- ✅ Spring Boot 2.7 REST API サーバー
- ✅ 動画・画像ファイル管理スクリプト
- ✅ MongoDB & AWS SSM Parameter Store 統合
- ✅ FFmpeg による動画メタデータ抽出
- ✅ 本番環境対応（Fat JAR ビルド）
- ✅ CORS対応

## 📁 Project Structure

```
java-script/
├── pom.xml                                      # Maven プロジェクト設定 (Spring Boot 統合)
├── secrets_data.json                           # 環境設定・パス設定ファイル
├── README.md                                   # このファイル
│
├── src/main/java/com/automation/
│   ├── Application.java                        # Spring Boot エントリーポイント
│   ├── util/
│   │   └── DbFunc.java                         # DB・JSON操作ユーティリティ
│   ├── controller/
│   │   ├── RootController.java                 # ルートエンドポイント
│   │   ├── VideoManagementController.java      # 動画管理 REST API
│   │   └── ImageManagementController.java      # 画像管理 REST API
│   ├── video/
│   │   ├── VideoFolderListup.java              # 動画フォルダ一覧化
│   │   └── VideoFilenameConverter.java         # 動画ファイル名変換
│   ├── image/
│   │   ├── ImageFolderListup.java              # 画像フォルダ一覧化
│   │   └── ImageFilenameConverter.java         # 画像ファイル名変換
│
└── src/main/resources/
    └── application.properties                  # Spring Boot 設定ファイル
```

## 🔧 Requirements

- **Java 11 以上**
- **Maven 3.6 以上**
- **FFmpeg** (JavaCVが自動ダウンロード)

## 🚀 Build & Usage

### 1. ビルド

```bash
cd backend/java-script
mvn clean package
```

### 2. Spring Boot REST API サーバー起動

```bash
# Fat JAR実行
java -jar target/file-automation-scripts-1.0.0.jar

# または Maven から直接実行
mvn spring-boot:run
```

サーバーは `http://localhost:8080/api` で起動します。

## 🔌 REST API Endpoints

### ヘルスチェック

```bash
GET http://localhost:8080/api/
GET http://localhost:8080/api/health
```

**Response:**
```json
{
  "status": "success",
  "message": "API is running",
  "version": "1.0.0",
  "timestamp": 1715923200000
}
```

### 📹 動画管理 API

#### JSONファイル存在確認

```bash
GET http://localhost:8080/api/management/video/folder/check/json
```

#### フォルダ内の動画一覧取得

```bash
GET http://localhost:8080/api/management/video/folder/view/files?folderPath=C:\Videos
```

**Response:**
```json
{
  "status": "success",
  "json_path": "..\\file_list.json",
  "files": [
    {
      "id": 1,
      "name": "video1.mp4",
      "path": "C:\\Videos\\video1.mp4",
      "size": 1048576,
      "extension": "mp4",
      "length": "01:23",
      "modified_time": "2024-05-16 12:34:56",
      "tags": ["sample", "video"]
    }
  ]
}
```

#### 動画ファイル名変更

```bash
POST http://localhost:8080/api/management/video/file/rename
Content-Type: application/json

{
  "oldPath": "C:\\Videos\\old_name.mp4",
  "newPath": "C:\\Videos\\new_name.mp4"
}
```

#### 動画ヘルスチェック

```bash
GET http://localhost:8080/api/management/video/health
```

### 🖼️ 画像管理 API

#### 相対パス内のフォルダ一覧

```bash
GET http://localhost:8080/api/management/image/folder/get/relativePath?basePath=C:\Images
```

**Response:**
```json
{
  "status": "success",
  "folders": ["subfolder1", "subfolder2"],
  "total": 2
}
```

#### JSONファイル存在確認

```bash
GET http://localhost:8080/api/management/image/folder/check/json
```

#### フォルダ内の画像一覧取得

```bash
GET http://localhost:8080/api/management/image/folder/view/files?folderPath=C:\Images
```

**Response:**
```json
{
  "status": "success",
  "json_path": "..\\image_list.json",
  "files": [
    {
      "id": 1,
      "name": "photo.png",
      "path": "C:\\Images\\photo.png",
      "size": 2097152,
      "extension": "png",
      "dimensions": "1920x1080",
      "modified_time": "2024-05-16 12:34:56",
      "tags": ["photo"]
    }
  ]
}
```

#### 画像ファイル名変更

```bash
POST http://localhost:8080/api/management/image/file/rename
Content-Type: application/json

{
  "oldPath": "C:\\Images\\old_name.png",
  "newPath": "C:\\Images\\new_name.png"
}
```

#### 画像ヘルスチェック

```bash
GET http://localhost:8080/api/management/image/health
```

## 🖥️ CLI スクリプト実行（従来の方法）

### 動画フォルダ一覧化

```bash
java -cp target/classes com.automation.video.VideoFolderListup "C:\path\to\videos"
```

出力: `file_list.json`

### 動画ファイル名変換

```bash
java -cp target/classes com.automation.video.VideoFilenameConverter "C:\old\path\video.mp4" "C:\new\path\video_new.mp4"
```

### 画像フォルダ一覧化

```bash
java -cp target/classes com.automation.image.ImageFolderListup "C:\path\to\images"
```

出力: `image_list.json`

### 画像ファイル名変換

```bash
java -cp target/classes com.automation.image.ImageFilenameConverter "C:\old\path\image.png" "C:\new\path\image_new.png"
```

## 📝 Core Classes

### Application.java

Spring Boot アプリケーションのエントリーポイント
- CORS設定（すべてのオリジンを許可）
- REST API サーバー起動

### DbFunc.java

DB・JSON操作ユーティリティ（静的メソッド）
- `appendToJson()`: JSONファイルにデータを追記（タイムスタンプ付き）
- `deleteJson()`: JSONファイルを削除
- `jsonRecover()`: JSONからデータを復元
- `logInsert()`: MongoDBにログ挿入
- `getMongoDbUrl()`: AWS SSMから接続URL取得

### VideoManagementController.java

動画管理の REST API エンドポイント
- JSONファイル存在確認
- フォルダ内の動画一覧取得
- ファイル名変更

### ImageManagementController.java

画像管理の REST API エンドポイント
- フォルダ一覧取得
- JSONファイル存在確認
- フォルダ内の画像一覧取得
- ファイル名変更

### VideoFolderListup.java

動画ファイルのスキャンとメタデータ抽出
- ディレクトリ再帰スキャン
- ファイル情報: 名前、パス、サイズ、拡張子
- 動画メタデータ: 長さ（MM:SS形式）、フレームレート
- JSON出力: `file_list.json`

### ImageFolderListup.java

画像ファイルのスキャンとメタデータ抽出
- ディレクトリ再帰スキャン
- ファイル情報: 名前、パス、サイズ、拡張子
- 画像メタデータ: 寸法（WIDTHxHEIGHT）
- JSON出力: `image_list.json`

### Filename Converters

ファイルリネームユーティリティ
- `VideoFilenameConverter`: 動画ファイル名変更
- `ImageFilenameConverter`: 画像ファイル名変更
- ディレクトリ自動作成
- エラーハンドリング

## ⚙️ Dependencies

### Spring Boot

- `spring-boot-starter-web`: REST API フレームワーク
- `spring-boot-starter-logging`: ロギング
- `spring-boot-starter-test`: テストフレームワーク

### File Processing

- `gson`: JSON処理
- `commons-io`: ファイル操作

### Database

- `mongo-java-driver`: MongoDB接続
- `software.amazon.awssdk.ssm`: AWS SSM Parameter Store

### Media

- `javacv`: OpenCV ラッパー
- `ffmpeg-platform`: FFmpeg バイナリ

詳細は `pom.xml` を参照

## 📦 Maven Commands

```bash
# クリーンビルド
mvn clean package

# コンパイルのみ
mvn compile

# テスト実行
mvn test

# スプリングブート直実行
mvn spring-boot:run

# ログ詳細表示でビルド
mvn clean package -X

# 依存関係確認
mvn dependency:tree
```

## 🔍 Logging

ログは SLF4j 経由で Spring Boot Logging が管理します。
設定: `src/main/resources/application.properties`

```properties
logging.level.root=INFO
logging.level.com.automation=DEBUG
```

## 📧 Configuration

`secrets_data.json` で環境パスを設定：

```json
{
  "video_source_path": "動画の入力パス",
  "video_output_path": "動画の出力パス",
  "image_source_path": "画像の入力パス",
  "image_output_path": "画像の出力パス",
  "thumbnail_base_path": "サムネイルの保存パス",
  "graph_save_path": "グラフの保存パス"
}
```

## 🐛 Troubleshooting

### Spring Boot ポート競合エラー

ポート 8080 が既に使用されている場合：

```properties
# application.properties で変更
server.port=8081
```

### FFmpeg エラー

FFmpeg はJavaCV がプラットフォームに応じて自動ダウンロードします。
手動インストールが必要な場合は [FFmpeg.org](https://ffmpeg.org) を参照

### MongoDB 接続エラー

AWS SSM Parameter Store から `Mongo_DB_Url` を取得しています。
AWS認証情報が正しく設定されているか確認してください。

### メモリ不足エラー

大きなビデオファイル処理時：

```bash
java -Xmx2G -jar target/file-automation-scripts-1.0.0.jar
```

## 📄 License

Original Python implementation と同じ

---

**Created**: 2024-05-16  
**Java Version**: 11+  
**Spring Boot**: 2.7.0+  
**Maven**: 3.6+
