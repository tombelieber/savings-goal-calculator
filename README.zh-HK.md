<div align="center">
  <img src="dist/icon.svg" alt="存款目標計算器" width="76" />
  <h1>存款目標計算器</h1>
  <p><strong>每月要儲幾多？出糧後點分錢？一眼睇清。</strong></p>
  <p>數字留喺自己瀏覽器嘅儲蓄試算工具。</p>
  <p><a href="https://savings-goal-calculator-9eo.pages.dev/#start"><strong>即刻試下</strong></a> · <a href="https://savings-goal-calculator-9eo.pages.dev/offline.zip">下載離線版</a> · <a href="README.md">English</a></p>
  <p>唔使註冊 · 財務輸入唔會上傳 · MIT License</p>
</div>

**「我每月要儲幾多？」** 填目標、收入同開支，第一眼就見到每月儲蓄目標、目前儲到幾多同缺口。再睇出糧分配：日常使費留幾多、帳單及稅金留幾多、真正可以儲起幾多。

介面用繁體廣東話，手機都方便填。內置香港帳單類別，支援六種顯示貨幣。

<p align="center">
  <img src="docs/images/bills-mobile.jpg" alt="每月總額或逐項拆細，揀一種填固定帳單" width="270" />
  <img src="docs/images/goal-mobile.jpg" alt="用虛構 2099 數據展示每月儲蓄目標及出糧分配" width="270" />
</p>

*真實產品畫面；所有數字均為虛構，走勢示例用 2099 年日期。*

## 幾條問題，睇到個計劃

1. **揀目標同期限。** 填已儲金額、每月收入同日常使費。
2. **固定帳單揀一種填法。** 一個每月總額，或者直接拆租金、水電煤、保險等分項，唔使填兩次。
3. **有 Bonus 就加，冇就略過。** 睇到結果之後，隨時拖 slider 再試。

鍾意一次過填？任何一頁都可以跳到完整工具。

## 睇清改一個數，會差幾遠

- 每月要儲幾多、目前缺口，同出糧後嘅日常／帳單／淨儲蓄分配。
- 儲蓄折線繼續畫到預計達標，最多估算十年。
- 試下每月少使啲、多賺啲，結果同圖表即時更新。
- Bonus 計指定到手月，水電煤按所揀付款月份扣整筆。
- 分享一條連結畀朋友，佢可以試改，唔會直接覆蓋自己原有計劃。

## 數字留喺自己度

輸入同未填完嘅進度只存呢個瀏覽器，冇金融資料 backend、帳號或追蹤工具。首次載入需要網絡；顯示「已備妥離線使用」後可離線重開，亦可以下載單一 HTML。

**分享連結包含你填嘅金額同名稱，唔係加密。** 任何收到連結嘅人都睇到。網站會向 Cloudflare 下載程式檔案；財務輸入唔會跟住上傳。清除網站資料會刪除本機設定。[私隱及分享詳情](PRIVACY.md)。

呢個係收支試算：唔計投資回報、通脹或自動估稅。差餉及年繳保費按月預留；揀貨幣只改顯示，唔會兌換金額。[計算方式](docs/calculation.md)。

## 自己運行／參與改善

直接用 [Cloudflare 網站](https://savings-goal-calculator-9eo.pages.dev/) 或 [離線下載](https://savings-goal-calculator-9eo.pages.dev/offline.zip)，唔使安裝。

開發及自架方法見 [英文 README](README.md#run-it-yourself)、[貢獻指引](CONTRIBUTING.md) 同 [Cloudflare 部署](docs/deployment.md)。報 bug、截圖、PR 請只用虛構數據；安全問題見 [SECURITY.md](SECURITY.md)。

由 [Tom Tang](https://github.com/tombelieber) 製作，採用 [MIT License](LICENSE)。
