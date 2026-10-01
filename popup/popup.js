import { extractFromTab, downloadMarkdown } from '../src/page-action.js'

const buttons = document.querySelectorAll('button')
const status = document.getElementById('status')

async function run(action, doneText) {
  buttons.forEach((button) => { button.disabled = true })
  status.textContent = '处理中…'
  status.dataset.state = 'busy'
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const { markdown, fileName } = await extractFromTab(tab.id)
    await action(markdown, fileName)
    status.textContent = doneText
    status.dataset.state = 'ok'
  } catch (error) {
    status.textContent = `失败：${error.message}`
    status.dataset.state = 'error'
  }
  buttons.forEach((button) => { button.disabled = false })
}

document.getElementById('copy').addEventListener('click', () => run((markdown) => navigator.clipboard.writeText(markdown), '已复制'))
document.getElementById('download').addEventListener('click', () => run(downloadMarkdown, '已开始下载'))
