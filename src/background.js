import { extractFromTab, copyInTab, downloadMarkdown } from './page-action.js'

const COPY_ID = 'copy-markdown'
const DOWNLOAD_ID = 'download-markdown'

function flashBadge(text) {
  chrome.action.setBadgeText({ text })
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000)
}

chrome.runtime.onInstalled.addListener(() => {
  const contexts = ['page', 'selection', 'link', 'image']
  chrome.contextMenus.create({ id: COPY_ID, title: '复制为 Markdown', contexts })
  chrome.contextMenus.create({ id: DOWNLOAD_ID, title: '下载为 Markdown', contexts })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    const { markdown, fileName } = await extractFromTab(tab.id)
    if (info.menuItemId === COPY_ID) await copyInTab(tab.id, markdown)
    else await downloadMarkdown(markdown, fileName)
    flashBadge('✓')
  } catch (error) {
    console.error(error)
    flashBadge('✗')
  }
})
