# jsdoc-plugin-dependency-graph

[English](README.md) | 日本語

モジュールの依存関係グラフを JSDoc の Home ページに埋め込むプラグインです。ノードをクリックすると、そのファイルのドキュメントページに移動します。ノードにカーソルを合わせるとつながっているノードが強調表示され、右クリックで強調表示を固定できます。

依存関係の解析には [dependency-cruiser](https://github.com/sverweij/dependency-cruiser)、描画には WebAssembly 版の Graphviz を使っているので、Graphviz などを別途インストールする必要はありません。

## インストール

```sh
npm install --save-dev jsdoc-plugin-dependency-graph
```

JSDoc の設定ファイルの `plugins` に追加します。

```json
{
	"plugins": ["node_modules/jsdoc-plugin-dependency-graph"]
}
```

設定はこれだけです。いつもどおり `jsdoc` を実行すれば、Home ページの README の上にグラフが表示されます。README がない場合は、グラフだけが Home ページに表示されます。

## オプション

オプションは JSDoc の設定ファイルの `dependencyGraph` に書きます。

```json
{
	"plugins": ["node_modules/jsdoc-plugin-dependency-graph"],
	"dependencyGraph": {
		"config": ".dependency-cruiser.cjs",
		"placement": "prepend",
		"title": "Dependency graph",
		"stats": true,
		"hoverHighlight": true,
		"failOnViolation": false
	}
}
```

| オプション        | 既定値               | 説明                                                                                                                                                                                                                                                                                                                                                            |
| ----------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config`          | 自動検出             | dependency-cruiser の設定ファイルのパス。省略すると、カレントディレクトリの `.dependency-cruiser.{json,js,cjs,mjs}` を探します。設定ファイルがない場合は、プロジェクト内のモジュールだけを描画します。`node_modules` のパッケージ、Node.js の組み込みモジュール、解決できない import は描画しません。これらも描画したい場合は、設定ファイルを用意してください。 |
| `placement`       | `"prepend"`          | グラフを挿入する位置。`"prepend"` は README の前、`"append"` は README の後ろ、`"replace"` は README の代わりに表示します。                                                                                                                                                                                                                                     |
| `title`           | `"Dependency graph"` | グラフの見出し。`false` にすると見出しを表示しません。                                                                                                                                                                                                                                                                                                          |
| `stats`           | `true`               | 見出しの下にモジュール数と依存関係の数を表示するかどうか。                                                                                                                                                                                                                                                                                                      |
| `hoverHighlight`  | `true`               | ホバー時の強調表示と右クリックでの固定を有効にするかどうか。有効にすると、そのための小さなスクリプトが埋め込まれます。                                                                                                                                                                                                                                          |
| `failOnViolation` | `false`              | `true` にすると、dependency-cruiser のルール違反を警告ではなくエラーとして扱います（JSDoc が 0 以外の終了コードで終了します）。                                                                                                                                                                                                                                 |

対象ファイルの絞り込み、フォルダ単位の折りたたみ、配色、ルールといったグラフ自体の設定は、すべて dependency-cruiser の設定ファイルで行います。このプラグインは設定をそのまま dependency-cruiser に渡して `dot` レポーターで出力するので、`reporterOptions.dot` の設定も反映されます。

## ノードのリンク先

各ノードのリンク先は、そのファイルについて JSDoc が生成するページの中から、次の優先順位で決まります。

1. `@module` が宣言されていれば、そのモジュールのページ
2. クラス・名前空間・ミックスイン・インターフェース・external が定義されていれば、そのページ
3. グローバルなシンボルがあれば、グローバルページ（ファイル名と同名のシンボル、なければ先頭のシンボルの位置にリンクします）
4. 別のファイルで定義されたクラスなどのメンバーがあれば、そのクラスなどのページ
5. どれにも当てはまらなければ、そのファイルのソースコードのページ

ドキュメント化されたシンボルが 1 つもないファイルは、JSDoc がページを生成しないため、ノードにリンクが付きません。

リンク先の URL は、テンプレートから取得するのではなく、JSDoc の命名規則に従ってプラグイン側で組み立てています。JSDoc のヘルパー関数にはファイル名の重複を避けるための副作用があり、テンプレートより先に呼ぶとテンプレートの出力が変わってしまうためです。この方式の制約として、ページ名が大文字・小文字の違いしかないシンボルが 2 つある場合だけは、正しいリンク先になりません。

## 仕組み

JSDoc のプラグインフックは同期処理ですが、dependency-cruiser の API は非同期です。そこで、グラフの描画は子プロセス（`lib/render.mjs`）で行い、結果を SVG で受け取っています。その後、`processingComplete` イベントで doclet からリンク先を解決し、SVG を `env.opts.readme` に挿入します。テンプレートは `env.opts.readme` の内容を Home ページに出力するので、そこにグラフが表示されます。

`lib/render.mjs` は JSDoc に依存していないので、`jsdoc-plugin-dependency-graph/render` を import すれば、JSDoc 以外のツールからも同じ SVG を生成できます。

## 動作環境

JSDoc 4 で動作します。デフォルトテンプレートと docdash で動作を確認しています。他のテンプレートでも、Home ページに `opts.readme` を出力するものであれば動くはずです（主要なテンプレートはいずれも該当します）。

## ライセンス

[MIT](LICENSE)
