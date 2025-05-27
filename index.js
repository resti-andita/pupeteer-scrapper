const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/scrape', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing 'url' parameter");

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const data = await page.evaluate(() => {
      const container = document.querySelector('div.speculative_charts');
      if (!container) return null;

      const table = container.querySelector('table');
      if (table) {
        return Array.from(table.querySelectorAll('tr')).map(tr =>
          Array.from(tr.querySelectorAll('td, th')).map(cell =>
            cell.innerText.trim()
          )
        );
      }

      // Fallback: extract div rows manually
      const items = Array.from(container.querySelectorAll('.data-row, .row'));
      if (items.length > 0) {
        return items.map(item =>
          Array.from(item.children).map(child => child.innerText.trim())
        );
      }

      return [[container.innerText.trim()]];
    });

    await browser.close();

    if (!data) return res.status(404).send("No data found");
    res.json({ url, data });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error scraping page");
  }
});

app.listen(port, () => {
  console.log(`Scraper running on port ${port}`);
});