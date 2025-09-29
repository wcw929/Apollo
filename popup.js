// 当前活动的标签
let currentTab = 'all';

document.addEventListener('DOMContentLoaded', function() {
    console.log('弹出页面DOM加载完成');
    loadStores();

    // 初始化清空按钮文本
    updateClearButtonText();

    // 导航栏点击事件
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabType = this.getAttribute('data-tab');
            console.log('切换到标签:', tabType);

            // 更新活动状态
            navTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // 更新当前标签
            currentTab = tabType;

            // 重新渲染内容
            loadStores();

            // 更新清空按钮文本
            updateClearButtonText();
        });
    });

    // 清空记录按钮
    document.getElementById('clear-all-btn').addEventListener('click', async function() {
        const confirmMessage = getConfirmMessage(currentTab);
        const actionDescription = getActionDescription(currentTab);

        if (confirm(confirmMessage)) {
            console.log(actionDescription);
            await clearStoresByTab(currentTab);
            await loadStores();
        }
    });

});

// 获取确认消息
function getConfirmMessage(tab) {
    const messages = {
        'all': '确定要清空所有暂存记录吗？此操作不可恢复。',
        'pending': '确定要清空所有待跟进的门店记录吗？此操作不可恢复。',
        'contacted': '确定要清空所有已联系的门店记录吗？此操作不可恢复。'
    };
    return messages[tab] || messages['all'];
}

// 获取操作描述
function getActionDescription(tab) {
    const descriptions = {
        'all': '清空所有记录',
        'pending': '清空待跟进记录',
        'contacted': '清空已联系记录'
    };
    return descriptions[tab] || descriptions['all'];
}

// 根据标签清空门店记录
async function clearStoresByTab(tab) {
    try {
        const result = await chrome.storage.local.get(['tempStores']);
        const stores = result.tempStores || [];

        let filteredStores;
        if (tab === 'all') {
            // 清空所有记录
            filteredStores = [];
        } else {
            // 只保留不是当前标签状态的记录
            filteredStores = stores.filter(store => store.status !== tab);
        }

        await chrome.storage.local.set({ tempStores: filteredStores });
        console.log(`已清空${tab}标签的记录，剩余记录数:`, filteredStores.length);

    } catch (error) {
        console.error('清空记录失败:', error);
        alert('清空记录失败，请重试');
    }
}

// 更新清空按钮文本
function updateClearButtonText() {
    const clearBtn = document.getElementById('clear-all-btn');
    if (clearBtn) {
        const buttonTexts = {
            'all': '清空所有',
            'pending': '清空待跟进',
            'contacted': '清空已联系'
        };
        clearBtn.textContent = buttonTexts[currentTab] || '清空所有';
    }
}

// 加载门店数据
async function loadStores() {
    console.log('开始加载门店数据...', '当前时间:', new Date().toLocaleString('zh-CN'));
    try {
        const result = await chrome.storage.local.get(['tempStores']);
        const stores = result.tempStores || [];
        console.log('从存储中获取到的门店数据:', stores);

        updateStats(stores);
        renderStores(stores);

    } catch (error) {
        console.error('加载数据失败:', error);
    }
}

// 更新统计信息
function updateStats(stores) {
    const totalCount = stores.length;
    const pendingCount = stores.filter(store => store.status === 'pending').length;
    const contactedCount = stores.filter(store => store.status === 'contacted').length;

    console.log('更新统计信息:', { totalCount, pendingCount, contactedCount });

    document.getElementById('total-count').textContent = totalCount;
    document.getElementById('pending-count').textContent = pendingCount;
    document.getElementById('contacted-count').textContent = contactedCount;
}

// 渲染门店列表
function renderStores(stores) {
    const content = document.getElementById('content');
    const emptyState = document.getElementById('empty-state');

    // 清除所有门店元素和日期分组，但保留emptyState
    const storeItems = content.querySelectorAll('.store-item, .date-group, .date-header');
    storeItems.forEach(item => item.remove());

    // 根据当前标签过滤门店
    let filteredStores = stores;
    if (currentTab !== 'all') {
        filteredStores = stores.filter(store => store.status === currentTab);
    }

    console.log('当前标签:', currentTab, '过滤后的门店数量:', filteredStores.length);

    if (filteredStores.length === 0) {
        emptyState.style.display = 'block';
        // 根据当前标签显示不同的空状态消息
        const emptyMessage = getEmptyMessage(currentTab);
        emptyState.querySelector('p').textContent = emptyMessage;
        console.log('显示空状态，门店数量:', filteredStores.length);
        return;
    }

    emptyState.style.display = 'none';
    console.log('隐藏空状态，开始渲染门店列表，门店数量:', filteredStores.length);

    // 按跟进时间排序，没有跟进时间的按创建时间排序
    filteredStores.sort((a, b) => {
        const aTime = a.followUpTime ? new Date(a.followUpTime) : new Date(a.createdAt);
        const bTime = b.followUpTime ? new Date(b.followUpTime) : new Date(b.createdAt);
        return aTime - bTime; // 升序排列，最近需要跟进的在前面
    });

    // 按跟进日期分组
    const groupedStores = groupStoresByFollowUpDate(filteredStores);

    // 获取排序后的日期键（最新的在前面）
    const sortedDateKeys = getSortedDateKeys(groupedStores);

    // 渲染分组后的门店
    sortedDateKeys.forEach(dateKey => {
        const storesInGroup = groupedStores[dateKey];

        // 创建日期标题
        const dateHeader = createDateHeader(dateKey, storesInGroup.length);
        content.appendChild(dateHeader);

        // 创建并添加该日期下的门店元素
        storesInGroup.forEach(store => {
            const storeElement = createStoreElement(store);
            content.appendChild(storeElement);
        });
    });

    console.log('门店列表渲染完成，共', Object.keys(groupedStores).length, '个日期分组');
}

// 获取空状态消息
function getEmptyMessage(tab) {
    const messages = {
        'all': '暂无门店信息',
        'pending': '暂无待跟进的门店',
        'contacted': '暂无已联系的门店'
    };
    return messages[tab] || '暂无门店信息';
}

// 按跟进日期分组门店
function groupStoresByFollowUpDate(stores) {
    const groups = {};

    stores.forEach(store => {
        let dateKey;

        if (store.followUpTime) {
            // 有跟进时间，按跟进时间分组 - 每次都重新计算相对时间
            const followUpDate = new Date(store.followUpTime);
            dateKey = formatFollowUpDateKey(followUpDate);
        } else {
            // 没有跟进时间，按创建时间分组，标记为"待安排"
            dateKey = '待安排跟进';
        }

        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(store);
    });

    return groups;
}

// 按日期分组门店（保留原函数作为备用）
function groupStoresByDate(stores) {
    const groups = {};

    stores.forEach(store => {
        const date = new Date(store.createdAt);
        const dateKey = formatDateKey(date);

        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(store);
    });

    return groups;
}

// 格式化跟进日期作为分组键
function formatFollowUpDateKey(date) {
    const today = new Date();
    const yesterday = new Date(today);
    const tomorrow = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 重置时间为0点，便于比较
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);

    const diffMs = compareDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        // 过期的跟进
        if (compareDate.getTime() === yesterday.getTime()) {
            return '⚠️ 昨天已过期';
        } else {
            const overdueDays = Math.abs(diffDays);
            return `⚠️ ${overdueDays}天前已过期`;
        }
    } else if (compareDate.getTime() === today.getTime()) {
        return '🔥 今天需跟进';
    } else if (compareDate.getTime() === tomorrow.getTime()) {
        return '📅 明天跟进';
    } else if (diffDays <= 7) {
        return `📅 ${diffDays}天后跟进`;
    } else {
        // 格式化为具体日期
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const year = date.getFullYear();
        const currentYear = new Date().getFullYear();

        if (year === currentYear) {
            return `📅 ${month}月${day}日跟进`;
        } else {
            return `📅 ${year}年${month}月${day}日跟进`;
        }
    }
}

// 格式化日期作为分组键（保留原函数）
function formatDateKey(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 重置时间为0点，便于比较
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
        return '今天';
    } else if (compareDate.getTime() === yesterday.getTime()) {
        return '昨天';
    } else {
        // 格式化为 "9月21日"
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const year = date.getFullYear();
        const currentYear = new Date().getFullYear();

        if (year === currentYear) {
            return `${month}月${day}日`;
        } else {
            return `${year}年${month}月${day}日`;
        }
    }
}

// 获取排序后的日期键
function getSortedDateKeys(groupedStores) {
    const dateKeys = Object.keys(groupedStores);

    // 按跟进优先级排序
    return dateKeys.sort((a, b) => {
        // 定义优先级权重
        const getPriority = (key) => {
            if (key.includes('已过期')) return 1; // 最高优先级：过期的
            if (key.includes('今天需跟进')) return 2; // 第二优先级：今天
            if (key.includes('明天跟进')) return 3; // 第三优先级：明天
            if (key.includes('天后跟进')) return 4; // 第四优先级：近期
            if (key.includes('待安排跟进')) return 6; // 较低优先级：待安排
            return 5; // 默认优先级：其他日期
        };

        const priorityA = getPriority(a);
        const priorityB = getPriority(b);

        if (priorityA !== priorityB) {
            return priorityA - priorityB; // 按优先级排序
        }

        // 同优先级内按时间排序
        if (priorityA === 4) { // 都是"X天后跟进"
            const daysA = parseInt(a.match(/(\d+)天后/)?.[1] || '0');
            const daysB = parseInt(b.match(/(\d+)天后/)?.[1] || '0');
            return daysA - daysB;
        }

        if (priorityA === 1) { // 都是过期的
            const daysA = parseInt(a.match(/(\d+)天前/)?.[1] || '0');
            const daysB = parseInt(b.match(/(\d+)天前/)?.[1] || '0');
            return daysB - daysA; // 过期时间越长越靠前
        }

        return a.localeCompare(b); // 其他情况按字母排序
    });
}

// 创建日期标题元素
function createDateHeader(dateKey, count) {
    const header = document.createElement('div');
    header.className = 'date-header';
    header.setAttribute('data-date-key', dateKey);
    header.innerHTML = `
        <span class="date-toggle">▼</span>
        <span class="date-text">${dateKey}</span>
        <span class="date-count">${count}</span>
    `;

    // 添加点击事件来切换折叠状态
    header.addEventListener('click', function() {
        const isCollapsed = header.classList.contains('collapsed');
        const dateKey = header.getAttribute('data-date-key');

        // 切换折叠状态
        header.classList.toggle('collapsed');

        // 更新箭头方向
        const toggle = header.querySelector('.date-toggle');
        toggle.textContent = isCollapsed ? '▼' : '▶';

        // 切换该日期下所有门店的显示状态
        const content = document.getElementById('content');
        const storeItems = content.querySelectorAll('.store-item');
        let foundDateGroup = false;

        storeItems.forEach(item => {
            // 检查这个门店是否属于当前日期组
            const prevElement = item.previousElementSibling;
            if (prevElement && prevElement.classList.contains('date-header') &&
                prevElement.getAttribute('data-date-key') === dateKey) {
                foundDateGroup = true;
            } else if (prevElement && prevElement.classList.contains('date-header')) {
                foundDateGroup = false;
            }

            // 如果属于当前日期组，切换显示状态
            if (foundDateGroup || (item.previousElementSibling &&
                item.previousElementSibling.classList.contains('date-header') &&
                item.previousElementSibling.getAttribute('data-date-key') === dateKey)) {

                if (isCollapsed) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            }
        });

        // 更简单的方法：找到当前header后面的所有store-item，直到下一个date-header
        let nextElement = header.nextElementSibling;
        while (nextElement && !nextElement.classList.contains('date-header')) {
            if (nextElement.classList.contains('store-item')) {
                if (isCollapsed) {
                    nextElement.style.display = 'block';
                } else {
                    nextElement.style.display = 'none';
                }
            }
            nextElement = nextElement.nextElementSibling;
        }
    });

    return header;
}

// 创建门店元素
function createStoreElement(store) {
    const div = document.createElement('div');
    div.className = 'store-item';

    const statusText = getStatusText(store.status);
    const statusClass = `status-${store.status}`;

    div.innerHTML = `
        <div class="store-name">${escapeHtml(store.storeName || '未知门店')}</div>
        <div class="store-info">
            <span class="status-badge ${statusClass}">${statusText}</span>
            ${store.shopId ? `<span style="margin-left: 8px;">门店ID: ${escapeHtml(store.shopId)}</span>` : ''}
        </div>
        ${store.pageUrl ? `<div class="store-info">页面链接: <a href="${escapeHtml(store.pageUrl)}" target="_blank" style="color: #ff6b35; text-decoration: none;">${escapeHtml(store.pageUrl.length > 50 ? store.pageUrl.substring(0, 50) + '...' : store.pageUrl)}</a></div>` : ''}
        ${store.followUpTime ? `<div class="follow-up-time">下次跟进: ${formatFollowUpTime(store.followUpTime)}</div>` : ''}
        ${store.notes ? `<div class="store-notes">${escapeHtml(store.notes)}</div>` : ''}
        <div class="time-info">创建时间: ${formatTimeOnly(store.createdAt)}</div>
        <div class="store-actions">
            <button class="btn btn-primary" data-action="open" data-url="${escapeHtml(store.pageUrl || store.url)}">打开页面</button>
            <button class="btn btn-secondary" data-action="edit" data-id="${store.id}">编辑</button>
            <button class="btn btn-secondary" data-action="contacted" data-id="${store.id}">已联系</button>
            <button class="btn btn-success" data-action="completed" data-id="${store.id}">已完成</button>
            <button class="btn btn-danger" data-action="delete" data-id="${store.id}">删除</button>
        </div>
    `;

    // 添加事件监听器
    const buttons = div.querySelectorAll('button[data-action]');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const action = this.getAttribute('data-action');
            const storeId = this.getAttribute('data-id');
            const url = this.getAttribute('data-url');

            console.log('按钮点击事件:', { action, storeId, url });

            try {
                switch(action) {
                    case 'open':
                        console.log('执行打开页面:', url);
                        openStore(url);
                        break;
                    case 'edit':
                        console.log('编辑门店:', storeId);
                        editStore(storeId);
                        break;
                    case 'contacted':
                        console.log('更新状态为已联系:', storeId);
                        updateStatus(storeId, 'contacted');
                        break;
                    case 'completed':
                        console.log('删除已完成的门店:', storeId);
                        if (confirm('确定要删除这条记录吗？已完成的门店将被永久删除。')) {
                            deleteStore(storeId);
                        }
                        break;
                    case 'delete':
                        console.log('删除门店:', storeId);
                        if (confirm('确定要删除这条记录吗？')) {
                            deleteStore(storeId);
                        }
                        break;
                    default:
                        console.log('未知操作:', action);
                }
            } catch (error) {
                console.error('执行操作时出错:', error);
            }
        });
    });

    return div;
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        'pending': '待跟进',
        'contacted': '已联系'
    };
    return statusMap[status] || '未知';
}

// 格式化日期时间
function formatDateTime(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return '今天 ' + date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } else if (diffDays === 1) {
        return '昨天 ' + date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } else if (diffDays < 7) {
        return `${diffDays}天前`;
    } else {
        return date.toLocaleDateString('zh-CN') + ' ' +
               date.toLocaleTimeString('zh-CN', {
                   hour: '2-digit',
                   minute: '2-digit'
               });
    }
}

// 只格式化时间（用于日期分组后的显示）
function formatTimeOnly(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 格式化跟进时间
function formatFollowUpTime(dateString) {
    if (!dateString) return '';

    const followUpDate = new Date(dateString);

    // 格式化日期时间显示
    const dateStr = followUpDate.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    const timeStr = followUpDate.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return `${dateStr} ${timeStr}`;
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 打开门店页面
function openStore(url) {
    console.log('openStore被调用，URL:', url);
    if (!url) {
        console.error('URL为空，无法打开页面');
        alert('页面链接为空，无法打开');
        return;
    }

    try {
        chrome.tabs.create({ url: url }, (tab) => {
            if (chrome.runtime.lastError) {
                console.error('打开页面失败:', chrome.runtime.lastError);
                alert('打开页面失败: ' + chrome.runtime.lastError.message);
            } else {
                console.log('页面打开成功:', tab);
            }
        });
    } catch (error) {
        console.error('chrome.tabs.create调用失败:', error);
        alert('打开页面失败: ' + error.message);
    }
}

// 更新门店状态
async function updateStatus(storeId, newStatus) {
    console.log('updateStatus被调用:', { storeId, newStatus });
    try {
        const result = await chrome.storage.local.get(['tempStores']);
        const stores = result.tempStores || [];
        console.log('当前存储的门店数据:', stores);

        const storeIndex = stores.findIndex(store => store.id === storeId);
        console.log('找到门店索引:', storeIndex);

        if (storeIndex !== -1) {
            stores[storeIndex].status = newStatus;
            stores[storeIndex].updatedAt = new Date().toISOString();

            await chrome.storage.local.set({ tempStores: stores });
            console.log('状态更新成功，重新加载数据');
            await loadStores(); // 重新加载数据
        } else {
            console.error('未找到指定的门店:', storeId);
            alert('未找到指定的门店');
        }
    } catch (error) {
        console.error('更新状态失败:', error);
        alert('更新状态失败，请重试');
    }
}

// 删除门店
async function deleteStore(storeId) {
    console.log('deleteStore被调用:', storeId);

    try {
        const result = await chrome.storage.local.get(['tempStores']);
        const stores = result.tempStores || [];
        console.log('删除前的门店数据:', stores);

        const filteredStores = stores.filter(store => store.id !== storeId);
        console.log('删除后的门店数据:', filteredStores);

        await chrome.storage.local.set({ tempStores: filteredStores });
        console.log('删除成功，重新加载数据');
        await loadStores(); // 重新加载数据

    } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败，请重试');
    }
}

// 编辑门店
async function editStore(storeId) {
    console.log('editStore被调用:', storeId);

    try {
        const result = await chrome.storage.local.get(['tempStores']);
        const stores = result.tempStores || [];
        const store = stores.find(s => s.id === storeId);

        if (!store) {
            console.error('未找到指定的门店:', storeId);
            alert('未找到指定的门店');
            return;
        }

        // 显示编辑模态框
        showEditModal(store);

    } catch (error) {
        console.error('获取门店信息失败:', error);
        alert('获取门店信息失败，请重试');
    }
}

// 显示编辑模态框
function showEditModal(store) {
    // 创建编辑模态框
    const modal = document.createElement('div');
    modal.id = 'edit-store-modal';
    modal.className = 'store-temp-modal';

    // 根据门店状态决定备注处理方式
    const existingNotes = store.notes || '';
    const currentTime = new Date().toLocaleString('zh-CN');
    let notesContent = '';
    let notesTip = '';

    if (store.status === 'pending') {
        // 待跟进状态：直接修改，不追加
        notesContent = existingNotes;
        notesTip = '💡 提示：当前为待跟进状态，可直接修改备注信息';
    } else {
        // 已联系或已完成状态：追加备注
        if (existingNotes.trim()) {
            // 如果有现有备注，保留并添加分隔线
            notesContent = existingNotes + '\n\n' + '='.repeat(30) + '\n' +
                          `【${currentTime} 更新】\n`;
        } else {
            // 如果没有现有备注，直接添加时间戳
            notesContent = `【${currentTime} 记录】\n`;
        }
        notesTip = '💡 提示：原有备注已保留，请在下方继续添加新的沟通记录';
    }

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>编辑门店信息</h3>
                <span class="close-btn">&times;</span>
            </div>
            <div class="modal-body">
                <form id="edit-store-form">
                    <div class="form-group">
                        <label for="edit-page-url">页面链接：</label>
                        <input type="text" id="edit-page-url" name="pageUrl" value="${escapeHtml(store.pageUrl || store.url || '')}" readonly>
                    </div>
                    <div class="form-group">
                        <label for="edit-store-name">门店名称：</label>
                        <input type="text" id="edit-store-name" name="storeName" value="${escapeHtml(store.storeName || '')}" readonly>
                    </div>
                    <div class="form-group">
                        <label for="edit-shop-id">门店ID：</label>
                        <input type="text" id="edit-shop-id" name="shopId" value="${escapeHtml(store.shopId || '')}" readonly>
                    </div>
                    <div class="form-group">
                        <label for="edit-follow-up-time">下次跟进时间：</label>
                        <input type="datetime-local" id="edit-follow-up-time" name="followUpTime" value="${store.followUpTime || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-notes">备注信息：</label>
                        <textarea id="edit-notes" name="notes" rows="8" placeholder="请输入门店情况、沟通记录、下次联系要点等...">${escapeHtml(notesContent)}</textarea>
                        <div class="notes-tip">${notesTip}</div>
                    </div>
                    <div class="form-group">
                        <label for="edit-status">门店状态：</label>
                        <select id="edit-status" name="status">
                            <option value="pending" ${store.status === 'pending' ? 'selected' : ''}>待跟进</option>
                            <option value="contacted" ${store.status === 'contacted' ? 'selected' : ''}>已联系</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel">取消</button>
                        <button type="submit" class="btn-save">保存修改</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .store-temp-modal {
            display: none;
            position: fixed;
            z-index: 10000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            justify-content: center;
            align-items: center;
        }

        .store-temp-modal .modal-content {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
        }

        .store-temp-modal .modal-header {
            padding: 20px 20px 10px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .store-temp-modal .modal-header h3 {
            margin: 0;
            color: #333;
            font-size: 18px;
        }

        .store-temp-modal .close-btn {
            font-size: 24px;
            cursor: pointer;
            color: #999;
            line-height: 1;
        }

        .store-temp-modal .close-btn:hover {
            color: #333;
        }

        .store-temp-modal .modal-body {
            padding: 20px;
        }

        .store-temp-modal .form-group {
            margin-bottom: 16px;
        }

        .store-temp-modal .form-group label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            color: #333;
        }

        .store-temp-modal .form-group input,
        .store-temp-modal .form-group textarea,
        .store-temp-modal .form-group select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
        }

        .store-temp-modal .form-group input:focus,
        .store-temp-modal .form-group textarea:focus,
        .store-temp-modal .form-group select:focus {
            outline: none;
            border-color: #ff6b35;
            box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.2);
        }

        .store-temp-modal .form-group input[readonly] {
            background-color: #f5f5f5;
            color: #666;
        }

        .store-temp-modal .notes-tip {
            margin-top: 6px;
            font-size: 12px;
            color: #666;
            font-style: italic;
        }

        .store-temp-modal .form-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #eee;
        }

        .store-temp-modal .btn-cancel,
        .store-temp-modal .btn-save {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }

        .store-temp-modal .btn-cancel {
            background-color: #f5f5f5;
            color: #666;
        }

        .store-temp-modal .btn-cancel:hover {
            background-color: #e0e0e0;
        }

        .store-temp-modal .btn-save {
            background-color: #ff6b35;
            color: white;
        }

        .store-temp-modal .btn-save:hover {
            background-color: #e55a2b;
        }
    `;

    // 如果样式还没有添加过，就添加
    if (!document.getElementById('edit-modal-styles')) {
        style.id = 'edit-modal-styles';
        document.head.appendChild(style);
    }

    // 添加到页面
    document.body.appendChild(modal);

    // 添加事件监听
    const closeBtn = modal.querySelector('.close-btn');
    const cancelBtn = modal.querySelector('.btn-cancel');
    const form = modal.querySelector('#edit-store-form');

    closeBtn.addEventListener('click', () => hideEditModal(modal));
    cancelBtn.addEventListener('click', () => hideEditModal(modal));
    form.addEventListener('submit', (e) => handleEditFormSubmit(e, store.id, modal));

    // 点击模态框外部关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            hideEditModal(modal);
        }
    });

    // 显示模态框
    modal.style.display = 'flex';
}

// 隐藏编辑模态框
function hideEditModal(modal) {
    if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
    }
}

// 处理编辑表单提交
async function handleEditFormSubmit(e, storeId, modal) {
    e.preventDefault();

    const formData = new FormData(e.target);

    try {
        const result = await chrome.storage.local.get(['tempStores']);
        const stores = result.tempStores || [];
        const storeIndex = stores.findIndex(store => store.id === storeId);

        if (storeIndex === -1) {
            alert('未找到指定的门店');
            return;
        }

        // 更新门店信息
        stores[storeIndex] = {
            ...stores[storeIndex],
            followUpTime: formData.get('followUpTime'),
            notes: formData.get('notes'),
            status: formData.get('status'),
            updatedAt: new Date().toISOString()
        };

        await chrome.storage.local.set({ tempStores: stores });

        // 隐藏模态框
        hideEditModal(modal);

        // 显示成功消息
        showSuccessMessage('门店信息更新成功！');

        // 重新加载数据
        await loadStores();

    } catch (error) {
        console.error('更新门店信息失败:', error);
        alert('更新失败，请重试');
    }
}

// 显示成功消息
function showSuccessMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(notification);

    // 3秒后自动消失
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// 函数现在通过事件监听器调用，不需要暴露到全局作用域
