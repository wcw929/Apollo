// 等待页面加载完成
(function() {
    'use strict';

    // 创建暂存门店按钮
    function createStoreButton() {
        const button = document.createElement('button');
        button.id = 'store-temp-btn';
        button.className = 'store-temp-button';
        button.innerHTML = '📋';
        button.title = '暂存门店 - 保存当前门店信息，方便后续跟进';

        // 添加点击事件
        button.addEventListener('click', showStoreModal);

        return button;
    }

    // 创建弹窗模态框
    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'store-temp-modal';
        modal.className = 'store-temp-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>暂存门店信息</h3>
                    <span class="close-btn">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="store-temp-form">
                        <div class="form-group">
                            <label for="page-url">页面链接：</label>
                            <input type="text" id="page-url" name="pageUrl" readonly>
                        </div>
                        <div class="form-group">
                            <label for="store-name">门店名称：</label>
                            <input type="text" id="store-name" name="storeName" readonly>
                        </div>
                        <div class="form-group">
                            <label for="shop-id">门店ID：</label>
                            <input type="text" id="shop-id" name="shopId" readonly>
                        </div>
                        <div class="form-group">
                            <label for="follow-up-time">下次跟进时间：</label>
                            <input type="datetime-local" id="follow-up-time" name="followUpTime">
                        </div>
                        <div class="form-group">
                            <label for="notes">备注信息：</label>
                            <textarea id="notes" name="notes" rows="6" placeholder="请输入门店情况、沟通记录、下次联系要点等..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-cancel">取消</button>
                            <button type="submit" class="btn-save">保存暂存</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // 添加事件监听
        const closeBtn = modal.querySelector('.close-btn');
        const cancelBtn = modal.querySelector('.btn-cancel');
        const form = modal.querySelector('#store-temp-form');

        closeBtn.addEventListener('click', hideStoreModal);
        cancelBtn.addEventListener('click', hideStoreModal);
        form.addEventListener('submit', handleFormSubmit);

        // 点击模态框外部关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideStoreModal();
            }
        });

        return modal;
    }

    // 显示弹窗
    function showStoreModal() {
        const modal = document.getElementById('store-temp-modal');
        if (modal) {
            // 自动填充门店信息
            fillStoreInfo();
            modal.style.display = 'flex';
        }
    }

    // 隐藏弹窗
    function hideStoreModal() {
        const modal = document.getElementById('store-temp-modal');
        if (modal) {
            modal.style.display = 'none';
            // 清空表单
            document.getElementById('store-temp-form').reset();
        }
    }

    // 自动填充门店信息
    function fillStoreInfo() {
        try {
            let storeName = '';
            let shopId = '';

            // 从iframe中提取门店信息
            const iframes = document.querySelectorAll('iframe');

            for (const iframe of iframes) {
                try {
                    // 尝试访问iframe内容
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                    if (iframeDoc) {
                        // 提取门店名称 (iframe中的h3)
                        if (!storeName) {
                            const h3Elements = iframeDoc.querySelectorAll('h3');
                            for (const h3 of h3Elements) {
                                const text = h3.textContent && h3.textContent.trim();
                                if (text && text.length > 0 && text !== '门店名称') {
                                    storeName = text;
                                    console.log('从iframe h3中提取到门店名称:', storeName);
                                    break;
                                }
                            }
                        }

                        // 提取shopid (iframe中h5里的span)
                        if (!shopId) {
                            const h5Elements = iframeDoc.querySelectorAll('h5');
                            for (const h5 of h5Elements) {
                                const spans = h5.querySelectorAll('span');
                                if (spans.length >= 1) {
                                    // 尝试不同的策略提取shopid
                                    if (spans.length >= 2) {
                                        // 如果有两个span，优先取第二个
                                        const secondSpan = spans[1].textContent.trim();
                                        if (secondSpan && secondSpan.length > 0) {
                                            shopId = secondSpan;
                                        } else {
                                            // 如果第二个为空，拼接两个
                                            shopId = `${spans[0].textContent.trim()}-${spans[1].textContent.trim()}`;
                                        }
                                    } else {
                                        // 只有一个span
                                        shopId = spans[0].textContent.trim();
                                    }

                                    if (shopId && shopId.length > 0) {
                                        console.log('从iframe h5中提取到shopId:', shopId);
                                        break;
                                    }
                                }
                            }
                        }

                        // 如果都找到了就退出循环
                        if (storeName && shopId) {
                            break;
                        }
                    }

                } catch (iframeError) {
                    // iframe可能有跨域限制，继续尝试下一个
                    console.log('无法访问iframe内容 (可能是跨域限制):', iframeError.message);
                    continue;
                }
            }

            // 如果iframe访问失败，尝试使用postMessage与iframe通信
            if ((!storeName || !shopId) && iframes.length > 0) {
                console.log('尝试使用postMessage与iframe通信...');
                // 向所有iframe发送消息请求数据
                for (const iframe of iframes) {
                    try {
                        iframe.contentWindow.postMessage({
                            type: 'GET_STORE_INFO',
                            source: 'store-temp-extension'
                        }, '*');
                    } catch (e) {
                        console.log('postMessage发送失败:', e);
                    }
                }

                // 监听iframe的回复（这里只是尝试，实际可能需要更复杂的处理）
                const messageHandler = (event) => {
                    if (event.data && event.data.type === 'STORE_INFO_RESPONSE') {
                        if (event.data.storeName && !storeName) {
                            storeName = event.data.storeName;
                        }
                        if (event.data.shopId && !shopId) {
                            shopId = event.data.shopId;
                        }
                        window.removeEventListener('message', messageHandler);
                    }
                };

                window.addEventListener('message', messageHandler);

                // 2秒后移除监听器
                setTimeout(() => {
                    window.removeEventListener('message', messageHandler);
                }, 2000);
            }

            // 如果iframe中没找到，尝试从主页面提取
            if (!storeName) {
                const nameSelectors = [
                    'h3', 'h1', 'h2',
                    '.store-name',
                    '.shop-name',
                    '[data-testid="store-name"]',
                    '.title'
                ];

                for (const selector of nameSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent.trim()) {
                        storeName = element.textContent.trim();
                        break;
                    }
                }
            }

            // 如果还是没找到门店名称，使用页面标题
            if (!storeName) {
                storeName = document.title || '未知门店';
            }

            // 如果没找到shopid，尝试从URL或其他地方提取
            if (!shopId) {
                // 尝试从URL参数中提取shopid
                const urlParams = new URLSearchParams(window.location.search);
                shopId = urlParams.get('shopId') ||
                        urlParams.get('shop_id') ||
                        urlParams.get('id') ||
                        '未获取到';
            }

            // 填充表单
            document.getElementById('store-name').value = storeName;
            document.getElementById('shop-id').value = shopId;
            document.getElementById('page-url').value = window.location.href;

        } catch (error) {
            console.log('自动填充门店信息失败:', error);
            // 设置默认值
            document.getElementById('store-name').value = document.title || '未知门店';
            document.getElementById('shop-id').value = '未获取到';
            document.getElementById('page-url').value = window.location.href;
        }
    }

    // 处理表单提交
    async function handleFormSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const storeData = {
            id: Date.now().toString(),
            pageUrl: formData.get('pageUrl'),
            storeName: formData.get('storeName'),
            shopId: formData.get('shopId'),
            followUpTime: formData.get('followUpTime'),
            notes: formData.get('notes'),
            url: formData.get('pageUrl') || window.location.href,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        try {
            // 保存到Chrome存储
            const result = await chrome.storage.local.get(['tempStores']);
            const tempStores = result.tempStores || [];
            tempStores.push(storeData);

            await chrome.storage.local.set({ tempStores });

            // 显示成功消息
            showNotification('门店信息已暂存成功！', 'success');
            hideStoreModal();

        } catch (error) {
            console.error('保存失败:', error);
            showNotification('保存失败，请重试', 'error');
        }
    }

    // 显示通知
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `store-notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // 3秒后自动消失
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // 初始化插件
    function init() {
        // 等待页面完全加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        // 创建并添加按钮
        const button = createStoreButton();

        // 直接添加到body，使用fixed定位
        document.body.appendChild(button);

        // 创建并添加模态框
        const modal = createModal();
        document.body.appendChild(modal);
    }

    // 启动插件
    init();

})();
