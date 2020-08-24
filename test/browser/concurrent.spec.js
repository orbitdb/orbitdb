'use strict'
const assert = require('assert')
const puppeteer = require('puppeteer')
const path = require('path')
const mapSeries = require('p-map-series')
const pMap = require('p-map')
const { config } = require('orbit-db-test-utils')

const clicksPerTab = 20
const numTabs = 3

const wait = async (milliseconds) => {
  return new Promise((resolve, reject) => {
    console.log("waiting...")
    setTimeout(resolve, milliseconds)
  })
}

describe(`orbit-db - browser concurrent writes`, function() {
  this.timeout(numTabs * config.timeout)

  let browser
  const options = {
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }

  before(async () => {
    browser = await puppeteer.launch(options)
  })

  after(async () => {
    await browser.close()
  })

  describe('Write concurrently', function() {
    let tabs = []
    before(async () => {
      const createTab = async () => {
        const page = await browser.newPage()
        await page.goto(`file://${path.resolve(__dirname, 'index.html')}`)
        page.on('dialog', dialog => dialog.dismiss())
        page.on('pageerror', err => console.error(err))
        await wait(1000)
        return page
      }

      // open several tabs
      for (let i = 0; i < numTabs; i++) {
        const tab = await createTab()
        tabs.push(tab)
      }

      const addDataButton = 'button#addData'
      await pMap(tabs, async (page) => {
        await page.waitForFunction(
          'document.querySelector("#waitForOpenDB").innerText.includes("orbitdb")'
        )
        const addDataToLog = (maxClicks, maxWaitTime) => {
          let count = 0
          const repeat = () => new Promise((resolve, reject) => {
            setTimeout(async () => {
              await page.click(addDataButton)
              if (++count < maxClicks) {
                await repeat()
              }
              resolve()
            }, Math.random() * maxWaitTime + 300) // ensure waiting at least ~300ms
          })
          return repeat()
        }

        return addDataToLog(clicksPerTab, 1000)
      })
    })

    it('syncLocal option - Multiple tabs converge to same log', async () => {
      return new Promise((resolve, reject) => {
        let polls = 0
        const interval = setInterval(async () => {
          let logHashes = []
          await mapSeries(tabs, async (page) => {
            await page.evaluate(() => loadLogs())
            const hash = await page.evaluate(async () => await getConsistentLogHash())
            logHashes.push(hash)
          })

          try {
            const hashes = Array.from(new Set(logHashes))
            // ensure log hashes are equal
            assert.strictEqual(hashes.length, 1)
            clearInterval(interval)
            resolve()
          } catch (e) {
            console.log("Repolling...")
            if (++polls > 5) {
              reject(e)
            }
          }
        }, 3000)
      })
    })

    it('no syncLocal option - Multiple tabs do not converge to same log', async () => {
      return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          let logHashes = []
          await mapSeries(tabs, async (page) => {
            await page.evaluate(() => loadLogs())
            const hash = await page.evaluate(async () => await getInconsistentLogHash())
            logHashes.push(hash)
          })

          try {
            const hashes = Array.from(new Set(logHashes))
            // logs hash different hashes
            assert.strictEqual(hashes.length, numTabs)
            clearInterval(interval)
            resolve()
          } catch (e) {
            reject(e)
          }
        }, 3000)
      })
    })
  })
})
