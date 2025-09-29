// 后台脚本 - 处理跟进时间提醒
console.log('门店暂存助手后台脚本启动');

// 监听扩展安装/启动
chrome.runtime.onStartup.addListener(() => {
    console.log('扩展启动，初始化提醒');
    initializeReminders();
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('扩展安装，初始化提醒');
    initializeReminders();
});

// 监听存储变化，更新提醒
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.tempStores) {
        console.log('门店数据变化，更新提醒');
        updateReminders();
    }
});

// 监听alarm事件
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name.startsWith('reminder_')) {
        const storeId = alarm.name.replace('reminder_', '');
        console.log('收到提醒alarm:', storeId);

        try {
            // 获取门店信息
            const result = await chrome.storage.local.get(['tempStores']);
            const stores = result.tempStores || [];
            const store = stores.find(s => s.id === storeId);

            if (store && store.status === 'pending') {
                await showReminder(store);
            } else {
                console.log('门店不存在或状态已变更，跳过提醒:', storeId);
            }
        } catch (error) {
            console.error('处理alarm提醒失败:', error);
        }
    } else if (alarm.name === 'debug_check') {
        // 定期检查alarm状态
        const alarms = await debugAlarms();
        const reminderAlarms = alarms.filter(a => a.name.startsWith('reminder_'));
        console.log(`定期检查: 当前有 ${reminderAlarms.length} 个提醒alarm`);
    }
});

// 初始化所有提醒
async function initializeReminders() {
    try {
        const result = await chrome.storage.local.get(['tempStores']);
        const stores = result.tempStores || [];

        // 清除现有alarm
        await clearAllAlarms();

        // 设置新的提醒
        let reminderCount = 0;
        for (const store of stores) {
            if (store.followUpTime && store.status === 'pending') {
                await setReminder(store);
                reminderCount++;
            }
        }

        console.log('提醒初始化完成，共设置', reminderCount, '个提醒');
    } catch (error) {
        console.error('初始化提醒失败:', error);
    }
}

// 更新提醒
async function updateReminders() {
    await initializeReminders();
}

// 设置单个提醒
async function setReminder(store) {
    if (!store.followUpTime || !store.id) return;

    const followUpTime = new Date(store.followUpTime);
    const now = new Date();

    // 如果时间已过，不设置提醒
    if (followUpTime <= now) {
        console.log('跟进时间已过期，不设置提醒:', store.storeName);
        return;
    }

    const alarmName = `reminder_${store.id}`;

    try {
        // 清除该门店的旧alarm
        await chrome.alarms.clear(alarmName);

        // 创建新的alarm
        await chrome.alarms.create(alarmName, {
            when: followUpTime.getTime()
        });

        console.log(`为门店 ${store.storeName} 设置提醒，将在 ${formatTime(followUpTime)} 提醒`);
    } catch (error) {
        console.error('设置提醒失败:', error);
    }
}

// 显示提醒
async function showReminder(store) {
    try {
        // 创建通知
        const notificationId = `reminder_${store.id}`;

        await chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: '门店跟进提醒',
            message: `是时候跟进门店：${store.storeName || '未知门店'}`,
            buttons: [
                { title: '立即处理' },
                { title: '稍后提醒' }
            ],
            requireInteraction: true
        });

        // 存储提醒信息，用于处理点击事件
        await chrome.storage.local.set({
            [`reminder_${store.id}`]: {
                storeId: store.id,
                storeName: store.storeName,
                pageUrl: store.pageUrl,
                timestamp: new Date().toISOString()
            }
        });

        console.log('显示提醒通知:', store.storeName);

    } catch (error) {
        console.error('显示提醒失败:', error);
    }
}

// 处理通知点击事件
chrome.notifications.onClicked.addListener(async (notificationId) => {
    if (notificationId.startsWith('reminder_')) {
        const storeId = notificationId.replace('reminder_', '');

        try {
            // 获取提醒信息
            const result = await chrome.storage.local.get([notificationId]);
            const reminderInfo = result[notificationId];

            if (reminderInfo && reminderInfo.pageUrl) {
                // 打开门店页面
                await chrome.tabs.create({ url: reminderInfo.pageUrl });
            }

            // 打开扩展弹窗
            await chrome.action.openPopup();

            // 清除通知
            await chrome.notifications.clear(notificationId);

            // 清除提醒信息
            await chrome.storage.local.remove([notificationId]);

        } catch (error) {
            console.error('处理通知点击失败:', error);
        }
    }
});

// 处理通知按钮点击事件
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    if (notificationId.startsWith('reminder_')) {
        const storeId = notificationId.replace('reminder_', '');

        try {
            const result = await chrome.storage.local.get([notificationId]);
            const reminderInfo = result[notificationId];

            if (buttonIndex === 0) {
                // 立即处理
                if (reminderInfo && reminderInfo.pageUrl) {
                    await chrome.tabs.create({ url: reminderInfo.pageUrl });
                }
                await chrome.action.openPopup();
            } else if (buttonIndex === 1) {
                // 稍后提醒 (15分钟后)
                const newReminderTime = new Date(Date.now() + 15 * 60 * 1000);

                // 更新门店的跟进时间
                const storesResult = await chrome.storage.local.get(['tempStores']);
                const stores = storesResult.tempStores || [];
                const storeIndex = stores.findIndex(s => s.id === storeId);

                if (storeIndex !== -1) {
                    stores[storeIndex].followUpTime = newReminderTime.toISOString();
                    await chrome.storage.local.set({ tempStores: stores });

                    // 重新设置alarm
                    const alarmName = `reminder_${storeId}`;
                    await chrome.alarms.clear(alarmName);
                    await chrome.alarms.create(alarmName, {
                        when: newReminderTime.getTime()
                    });

                    console.log('延迟提醒15分钟:', reminderInfo.storeName);
                }
            }

            // 清除通知和提醒信息
            await chrome.notifications.clear(notificationId);
            await chrome.storage.local.remove([notificationId]);

        } catch (error) {
            console.error('处理通知按钮点击失败:', error);
        }
    }
});

// 清除所有alarm
async function clearAllAlarms() {
    try {
        const alarms = await chrome.alarms.getAll();
        const reminderAlarms = alarms.filter(alarm => alarm.name.startsWith('reminder_'));

        for (const alarm of reminderAlarms) {
            await chrome.alarms.clear(alarm.name);
        }

        console.log('清除所有提醒alarm，共', reminderAlarms.length, '个');
    } catch (error) {
        console.error('清除alarm失败:', error);
    }
}

// 格式化时间显示
function formatTime(date) {
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 监听扩展卸载，清理资源
chrome.runtime.onSuspend.addListener(async () => {
    console.log('扩展挂起，清理资源');
    await clearAllAlarms();
});

// 添加调试功能 - 查看当前所有alarm
async function debugAlarms() {
    try {
        const alarms = await chrome.alarms.getAll();
        console.log('当前所有alarm:', alarms);
        return alarms;
    } catch (error) {
        console.error('获取alarm列表失败:', error);
        return [];
    }
}

// 定期检查alarm状态（每5分钟）
chrome.alarms.create('debug_check', { periodInMinutes: 5 });
