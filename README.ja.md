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
		"outputType": "dot",
		"placement": "prepend",
		"title": "Dependency graph",
		"stats": true,
		"hoverHighlight": true,
		"failOnViolation": false
	}
}
```

| オプション        | 既定値               | 説明                                                                                                                                                                                                   |
| ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `config`          | 自動検出             | dependency-cruiser の設定ファイルのパス。省略すると、カレントディレクトリの `.dependency-cruiser.{json,js,cjs,mjs}` を探します。設定ファイルがない場合は、プロジェクト内のモジュールだけを描画します。 |
| `outputType`      | `"dot"`              | dependency-cruiser のレポーター。`"dot"` はファイル単位、`"flat"` はフォルダの枠なしのファイル単位、`"ddot"` はフォルダ単位、`"archi"` は設定ファイルで決めた単位で描画します。                        |
| `placement`       | `"prepend"`          | グラフを挿入する位置。`"prepend"` は README の前、`"append"` は README の後ろ、`"replace"` は README の代わりに表示します。                                                                            |
| `title`           | `"Dependency graph"` | グラフの見出し。`false` にすると見出しを表示しません。                                                                                                                                                 |
| `stats`           | `true`               | 見出しの下にモジュール数と依存関係の数を表示するかどうか。                                                                                                                                             |
| `hoverHighlight`  | `true`               | ホバー時の強調表示と右クリックでの固定を有効にするかどうか。                                                                                                                                           |
| `failOnViolation` | `false`              | `true` にすると、dependency-cruiser のルール違反をエラーとして扱い、JSDoc が失敗で終了します。                                                                                                         |

対象ファイルの絞り込み、フォルダ単位の折りたたみ、配色、ルールといったグラフ自体の設定は、すべて dependency-cruiser の設定ファイルで行います。選んだレポーターの `reporterOptions` も反映されます。

大きなグラフで矢印を直角に描けないときは、曲線で描画します。

## ノードのリンク先

各ノードのリンク先は、そのファイルについて JSDoc が生成するページの中から、次の優先順位で決まります。

1. `@module` が宣言されていれば、そのモジュールのページ
2. クラス・名前空間・ミックスイン・インターフェース・external が定義されていれば、そのページ
3. グローバルなシンボルがあれば、グローバルページ。ファイル名と同名のシンボル、なければ先頭のシンボルの位置にリンクします
4. 別のファイルで定義されたクラスなどのメンバーがあれば、そのクラスなどのページ
5. どれにも当てはまらなければ、そのファイルのソースコードのページ

ドキュメント化されたシンボルが 1 つもないファイルは、JSDoc がページを生成しないため、ノードにリンクが付きません。`"ddot"` や `"archi"`、`collapsePattern` で描かれるフォルダのノードも同じです。

ページ名が大文字・小文字の違いしかないシンボルが 2 つある場合は、正しいリンク先になりません。

## 動作環境

JSDoc 4 で動作します。動作を確認しているのはデフォルトテンプレートです。他のテンプレートでも、Home ページに `opts.readme` を出力するものであれば動くはずです。

## ライセンス

[MIT](LICENSE)
