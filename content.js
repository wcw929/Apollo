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

    // 创建自定义日期时间选择器
    function createCustomDateTimePicker() {
        const container = document.createElement('div');
        container.className = 'custom-datetime-container';
        container.innerHTML = `
            <div class="datetime-display" id="datetime-display">
                <span class="datetime-text">请选择跟进时间</span>
                <span class="datetime-icon">📅</span>
            </div>
            <div class="datetime-picker-popup" id="datetime-picker-popup">
                <div class="picker-header">
                    <button type="button" class="nav-btn" id="prev-month">‹</button>
                    <span class="current-month" id="current-month"></span>
                    <button type="button" class="nav-btn" id="next-month">›</button>
                </div>
                <div class="calendar-grid" id="calendar-grid"></div>
                <div class="time-selector">
                    <div class="time-input-group">
                        <label>时间：</label>
                        <select id="hour-select"></select>
                        <span>:</span>
                        <select id="minute-select"></select>
                    </div>
                </div>
                <div class="picker-actions">
                    <button type="button" class="btn-clear">清除</button>
                    <button type="button" class="btn-now">现在</button>
                    <button type="button" class="btn-confirm">确定</button>
                </div>
            </div>
        `;

        // 初始化选择器
        initDateTimePicker(container);

        return container;
    }

    // 初始化日期时间选择器
    function initDateTimePicker(container) {
        const display = container.querySelector('.datetime-display');
        const popup = container.querySelector('.datetime-picker-popup');
        const calendarGrid = container.querySelector('#calendar-grid');
        const hourSelect = container.querySelector('#hour-select');
        const minuteSelect = container.querySelector('#minute-select');
        const currentMonthSpan = container.querySelector('#current-month');

        let selectedDate = null;
        let currentViewDate = new Date();

        // 生成小时选项
        for (let i = 0; i < 24; i++) {
            const option = document.createElement('option');
            option.value = i.toString().padStart(2, '0');
            option.textContent = i.toString().padStart(2, '0');
            hourSelect.appendChild(option);
        }

        // 生成分钟选项（每10分钟）
        for (let i = 0; i < 60; i += 10) {
            const option = document.createElement('option');
            option.value = i.toString().padStart(2, '0');
            option.textContent = i.toString().padStart(2, '0');
            minuteSelect.appendChild(option);
        }

        // 显示弹窗
        display.addEventListener('click', () => {
            popup.style.display = 'block';
            renderCalendar();
        });

        // 月份导航
        container.querySelector('#prev-month').addEventListener('click', () => {
            currentViewDate.setMonth(currentViewDate.getMonth() - 1);
            renderCalendar();
        });

        container.querySelector('#next-month').addEventListener('click', () => {
            currentViewDate.setMonth(currentViewDate.getMonth() + 1);
            renderCalendar();
        });

        // 现在按钮
        container.querySelector('.btn-now').addEventListener('click', (e) => {
            e.stopPropagation();
            const now = new Date();
            selectedDate = now;
            hourSelect.value = now.getHours().toString().padStart(2, '0');
            minuteSelect.value = (Math.floor(now.getMinutes() / 10) * 10).toString().padStart(2, '0');
            updateDisplay();
            popup.style.display = 'none';
            display.classList.remove('active');
        });

        // 清除按钮
        container.querySelector('.btn-clear').addEventListener('click', () => {
            selectedDate = null;
            hourSelect.value = '';
            minuteSelect.value = '';
            updateDisplay();
            popup.style.display = 'none';
        });

        // 确定按钮
        container.querySelector('.btn-confirm').addEventListener('click', (e) => {
            e.stopPropagation();
            if (selectedDate && hourSelect.value && minuteSelect.value) {
                updateDisplay();
                popup.style.display = 'none';
                display.classList.remove('active');
            } else {
                showNotification('请选择日期和时间', 'error');
            }
        });

        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                popup.style.display = 'none';
            }
        });

        // 渲染日历
        function renderCalendar() {
            const year = currentViewDate.getFullYear();
            const month = currentViewDate.getMonth();
            currentMonthSpan.textContent = `${year}年${month + 1}月`;

            calendarGrid.innerHTML = '';

            // 添加星期标题
            const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
            weekdays.forEach(day => {
                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header';
                dayHeader.textContent = day;
                calendarGrid.appendChild(dayHeader);
            });

            // 获取月份第一天和最后一天
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());

            // 生成日历格子
            for (let i = 0; i < 42; i++) {
                const cellDate = new Date(startDate);
                cellDate.setDate(startDate.getDate() + i);
                const dayCell = document.createElement('div');
                dayCell.className = 'day-cell';
                dayCell.textContent = cellDate.getDate();

                // 检查是否是过去的日期
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const checkDate = new Date(cellDate);
                checkDate.setHours(0, 0, 0, 0);

                if (cellDate.getMonth() !== month) {
                    dayCell.classList.add('other-month');
                }

                if (checkDate < today) {
                    dayCell.classList.add('past-date');
                    dayCell.style.cursor = 'not-allowed';
                }

                if (selectedDate &&
                    cellDate.getDate() === selectedDate.getDate() &&
                    cellDate.getMonth() === selectedDate.getMonth() &&
                    cellDate.getFullYear() === selectedDate.getFullYear()) {
                    dayCell.classList.add('selected');
                }

                if (cellDate.toDateString() === new Date().toDateString()) {
                    dayCell.classList.add('today');
                }

                dayCell.addEventListener('click', () => {
                    // 检查是否是过去的日期
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // 重置时间为当天0点
                    const clickedDate = new Date(cellDate);
                    clickedDate.setHours(0, 0, 0, 0);

                    if (clickedDate < today) {
                        // 显示提示信息
                        showNotification('不能选择过去的日期', 'error');
                        return;
                    }

                    selectedDate = new Date(cellDate);
                    document.querySelectorAll('.day-cell.selected').forEach(cell => {
                        cell.classList.remove('selected');
                    });
                    dayCell.classList.add('selected');
                });

                calendarGrid.appendChild(dayCell);
            }
        }

        // 更新显示
        function updateDisplay() {
            if (selectedDate) {
                // 使用统一的日期格式：YYYY/MM/DD HH:mm
                const year = selectedDate.getFullYear();
                const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
                const day = selectedDate.getDate().toString().padStart(2, '0');
                const hour = hourSelect.value;
                const minute = minuteSelect.value;

                display.querySelector('.datetime-text').textContent = `${year}/${month}/${day} ${hour}:${minute}`;
            } else {
                display.querySelector('.datetime-text').textContent = '请选择跟进时间';
            }
        }

        // 监听时间选择变化
        hourSelect.addEventListener('change', updateDisplay);
        minuteSelect.addEventListener('change', updateDisplay);
    }

    // 创建弹窗模态框
    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'store-temp-modal';
        modal.className = 'store-temp-modal';

        // 创建自定义日期时间选择器
        const dateTimePicker = createCustomDateTimePicker();
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
                            <label>下次跟进时间：</label>
                            <div id="datetime-picker-container"></div>
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

        // 将日期时间选择器添加到表单
        const container = modal.querySelector('#datetime-picker-container');
        container.appendChild(dateTimePicker);

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

    // 获取自定义日期时间值
    function getCustomDateTimeValue() {
        try {
            // 获取当前模态框中的日期时间选择器
            const modal = document.getElementById('store-temp-modal');
            if (!modal) {
                console.log('找不到模态框');
                return '';
            }

            const display = modal.querySelector('.datetime-display .datetime-text');
            if (!display || display.textContent === '请选择跟进时间') {
                console.log('没有选择日期时间');
                return '';
            }

            const dateTimeStr = display.textContent.trim();
            console.log('开始解析日期时间字符串:', dateTimeStr);

            // 解析格式：YYYY/MM/DD HH:mm
            const parts = dateTimeStr.split(' ');
            if (parts.length !== 2) {
                console.error('日期时间格式不正确，缺少空格分隔:', dateTimeStr);
                return '';
            }

            const datePart = parts[0]; // YYYY/MM/DD
            const timePart = parts[1]; // HH:mm

            const dateParts = datePart.split('/');
            const timeParts = timePart.split(':');

            if (dateParts.length !== 3 || timeParts.length !== 2) {
                console.error('日期或时间部分格式不正确:', datePart, timePart);
                return '';
            }

            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // 月份从0开始
            const day = parseInt(dateParts[2]);
            const hour = parseInt(timeParts[0]);
            const minute = parseInt(timeParts[1]);

            // 验证数值有效性
            if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
                console.error('日期时间数值无效:', year, month, day, hour, minute);
                return '';
            }

            if (month < 0 || month > 11 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
                console.error('日期时间数值超出有效范围');
                return '';
            }

            const dateTime = new Date(year, month, day, hour, minute);

            if (isNaN(dateTime.getTime())) {
                console.error('创建的日期对象无效');
                return '';
            }

            // 转换为 datetime-local 格式 (YYYY-MM-DDTHH:mm)
            // 不使用toISOString()避免时区转换问题
            const resultYear = dateTime.getFullYear();
            const resultMonth = (dateTime.getMonth() + 1).toString().padStart(2, '0');
            const resultDay = dateTime.getDate().toString().padStart(2, '0');
            const resultHour = dateTime.getHours().toString().padStart(2, '0');
            const resultMinute = dateTime.getMinutes().toString().padStart(2, '0');

            const result = `${resultYear}-${resultMonth}-${resultDay}T${resultHour}:${resultMinute}`;
            console.log('日期时间解析成功:', result);
            return result;

        } catch (e) {
            console.error('日期时间解析异常:', e);
            return '';
        }
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
            // 重置日期时间选择器
            const display = modal.querySelector('.datetime-display .datetime-text');
            if (display) {
                display.textContent = '请选择跟进时间';
            }
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

        console.log('开始处理表单提交...');

        const formData = new FormData(e.target);
        const customDateTime = getCustomDateTimeValue(); // 使用自定义日期时间值

        console.log('获取到的自定义时间值:', customDateTime);

        // 验证必填字段
        if (!formData.get('storeName') || formData.get('storeName') === '未知门店') {
            showNotification('请先选择有效的门店信息', 'error');
            return;
        }

        // 验证时间是否已选择
        if (!customDateTime) {
            showNotification('请选择跟进时间', 'error');
            return;
        }

        const storeData = {
            id: Date.now().toString(),
            pageUrl: formData.get('pageUrl'),
            storeName: formData.get('storeName'),
            shopId: formData.get('shopId'),
            followUpTime: customDateTime, // 使用自定义日期时间值
            notes: formData.get('notes'),
            url: formData.get('pageUrl') || window.location.href,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        console.log('准备保存的数据:', storeData);

        try {
            // 保存到Chrome存储
            console.log('正在保存到Chrome存储...');
            const result = await chrome.storage.local.get(['tempStores']);
            const tempStores = result.tempStores || [];
            tempStores.push(storeData);

            await chrome.storage.local.set({ tempStores });
            console.log('保存成功！');

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
