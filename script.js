// AI Chat functionality
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');

// n8n webhook URL - замените на ваш реальный URL
const N8N_WEBHOOK_URL = 'https://aiauton8n.ru/webhook/881e1f42-758b-461b-a6a0-6f0075bf0109';

// Функция для простой обработки Markdown
function parseMarkdown(text) {
    return text
        // Заголовки
        .replace(/### (.*$)/gim, '<h3>$1</h3>')
        .replace(/## (.*$)/gim, '<h2>$1</h2>')
        .replace(/# (.*$)/gim, '<h1>$1</h1>')
        // Жирный текст
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        // Курсив
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        // Списки
        .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        // Переносы строк
        .replace(/\n/gim, '<br>');
}

// Генерация или получение session_id для памяти n8n
function getSessionId() {
    let sessionId = localStorage.getItem('n8n_session_id');
    if (!sessionId) {
        // Генерируем уникальный session_id
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('n8n_session_id', sessionId);
    }
    return sessionId;
}

// Функция для отправки сообщения в n8n и получения ответа
async function sendToN8N(message) {
    try {
        const sessionId = getSessionId();
        
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                session_id: sessionId,
                timestamp: new Date().toISOString(),
                source: 'website_chat'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Обработка формата ответа от n8n
        let aiResponse;
        
        if (Array.isArray(data) && data.length > 0) {
            // Если ответ - массив объектов
            aiResponse = data[0].output || data[0].response || data[0].message;
        } else if (data.output) {
            // Если ответ - объект с полем output
            aiResponse = data.output;
        } else if (data.response) {
            // Если ответ - объект с полем response
            aiResponse = data.response;
        } else if (data.message) {
            // Если ответ - объект с полем message
            aiResponse = data.message;
        } else {
            // Если структура неизвестна, попробуем взять весь объект как строку
            aiResponse = typeof data === 'string' ? data : JSON.stringify(data);
        }
        
        return aiResponse || 'Извините, получен пустой ответ от ИИ агента.';
        
    } catch (error) {
        console.error('Ошибка при отправке в n8n:', error);
        return 'Извините, сервис временно недоступен. Попробуйте позже или свяжитесь с нами напрямую.';
    }
}

// Fallback ответы на случай недоступности n8n
const fallbackResponses = {
    'продажи': 'ИИ агенты могут увеличить продажи на 40-60% за счет: 🎯 Квалификации лидов 24/7 📞 Обработки возражений 📈 Персонализации предложений 🤖 Автоматического follow-up',
    'стоимость': 'Стоимость внедрения ИИ решений от 150 000₽. Окупаемость 3-6 месяцев. 💰 ROI до 300% в первый год 📊 Экономия на зарплатах до 1М₽/год ⚡ Увеличение эффективности в 2-3 раза',
    'сроки': 'Сроки внедрения ИИ автоматизации: 📅 Анализ и планирование: 1-2 недели 🔧 Разработка и настройка: 2-4 недели 🚀 Тестирование и запуск: 1 неделя 📚 Обучение команды: 3-5 дней',
    'автоматизация': 'ИИ автоматизация включает: 🤖 Обработку входящих заявок 📧 Email и SMS рассылки 📞 Телефонные звонки 📊 Аналитику и отчеты 🔄 Интеграцию с CRM',
    'преимущества': 'Главные преимущества ИИ: ⏰ Экономия 60+ часов в месяц 💰 Снижение затрат на 40% 🚀 Рост конверсии в 2.5 раза 🎯 Работа 24/7 без выходных 📈 Масштабируемость бизнеса',
    'default': 'Отличный вопрос! ИИ автоматизация поможет: ✅ Увеличить продажи ✅ Снизить затраты ✅ Автоматизировать рутину ✅ Улучшить клиентский сервис Хотите узнать подробнее о конкретном решении?'
};

function getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    for (const [key, response] of Object.entries(fallbackResponses)) {
        if (lowerMessage.includes(key)) {
            return response;
        }
    }
    
    return fallbackResponses.default;
}

// Обновленная функция добавления сообщения
function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    // Обрабатываем Markdown только для сообщений ИИ
    const processedContent = isUser ? content : parseMarkdown(content);
    
    messageDiv.innerHTML = `
        <div class="message-content">${processedContent}</div>
        <div class="message-time">${timeString}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Функция для показа индикатора печати
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message typing-indicator';
    typingDiv.id = 'typing-indicator';
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    typingDiv.innerHTML = `
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            ИИ агент печатает...
        </div>
        <div class="message-time">${timeString}</div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Добавляем сообщение пользователя
    addMessage(message, true);
    chatInput.value = '';
    
    // Показываем индикатор печати
    showTypingIndicator();
    
    try {
        // Отправляем сообщение в n8n
        const aiResponse = await sendToN8N(message);
        
        // Убираем индикатор печати
        removeTypingIndicator();
        
        // Добавляем ответ ИИ
        addMessage(aiResponse);
    } catch (error) {
        console.error('Ошибка при получении ответа:', error);
        
        // Убираем индикатор печати
        removeTypingIndicator();
        
        // Используем fallback ответ
        const fallbackResponse = getFallbackResponse(message);
        addMessage(fallbackResponse);
    }
}

function askQuestion(question) {
    chatInput.value = question;
    sendMessage();
}

// Enter key support
chatInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Smooth scrolling
function scrollToChat() {
    document.getElementById('chat').scrollIntoView({ behavior: 'smooth' });
}

function scrollToContact() {
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
}

// Функция для показа красивого уведомления об успехе
function showSuccessModal() {
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'success-modal';
    modal.innerHTML = `
        <div class="success-modal-content">
            <div class="success-icon"></div>
            <h3 class="success-title">Заявка отправлена!</h3>
            <p class="success-message">Спасибо за ваш интерес! Мы свяжемся с вами в течение 30 минут для обсуждения возможностей автоматизации вашего бизнеса.</p>
            <button class="success-close-btn" onclick="closeSuccessModal()">Понятно</button>
        </div>
    `;
    
    // Добавляем модальное окно в DOM
    document.body.appendChild(modal);
    
    // Показываем модальное окно с анимацией
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Закрытие по клику на фон
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeSuccessModal();
        }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSuccessModal();
        }
    });
}

// Функция для закрытия модального окна
function closeSuccessModal() {
    const modal = document.querySelector('.success-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Contact form submission
function submitForm(event) {
    event.preventDefault();
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    // Показываем индикатор загрузки
    submitButton.textContent = 'Отправляем...';
    submitButton.disabled = true;
    submitButton.classList.add('btn-loading');
    
    // Инициализация EmailJS (замените на ваши реальные ключи)
    emailjs.init('sBuMaqoD5p9XWhFrn'); // Замените на ваш Public Key
    
    // Параметры для отправки
    const templateParams = {
        from_name: event.target.name.value,
        from_email: event.target.email.value,
        phone: event.target.phone.value,
        company: event.target.company.value || 'Не указана',
        message: event.target.message.value || 'Запрос на консультацию',
        to_email: 'kirillkhaev6391@gmail.com' // Замените на вашу почту
    };
    
    // Отправка через EmailJS
    emailjs.send('service_83x8gpn', 'template_7t45ibm', templateParams) // Замените на ваши ID
        .then(function(response) {
            console.log('SUCCESS!', response.status, response.text);
            
            // Показываем красивое уведомление вместо alert
            showSuccessModal();
            
            // Сбрасываем форму
            event.target.reset();
        })
        .catch(function(error) {
            console.error('FAILED...', error);
            
            // Для ошибок пока оставляем alert (можно также сделать красивое модальное окно)
            alert('Произошла ошибка при отправке. Попробуйте еще раз или свяжитесь с нами напрямую.');
        })
        .finally(function() {
            // Восстанавливаем кнопку
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            submitButton.classList.remove('btn-loading');
        });
}

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Add scroll effect to header
window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
    }
});


// Calculator functionality
function updateCalculator() {
    const employees = document.getElementById('employees').value;
    const avgSalary = document.getElementById('avgSalary').value;
    const automationPercent = document.getElementById('automationPercent').value;
    const timeReduction = document.getElementById('timeReduction').value;
    
    // Update display values
    document.getElementById('employeesValue').textContent = employees;
    document.getElementById('avgSalaryValue').textContent = formatNumber(avgSalary);
    document.getElementById('automationPercentValue').textContent = automationPercent + '%';
    document.getElementById('timeReductionValue').textContent = timeReduction + '%';
    
    // Calculate savings
    const affectedEmployees = Math.round(employees * (automationPercent / 100));
    const timeReductionDecimal = timeReduction / 100;
    const monthlySavingsPerEmployee = (avgSalary * timeReductionDecimal);
    const totalMonthlySavings = Math.round(affectedEmployees * monthlySavingsPerEmployee);
    const yearlySavings = totalMonthlySavings * 12;
    
    // Calculate time saved (assuming 160 working hours per month)
    const timeSavedHours = Math.round(affectedEmployees * 160 * timeReductionDecimal);
    
    // Calculate ROI (assuming implementation cost is 2 months of savings)
    const implementationCost = totalMonthlySavings * 2;
    const roi = Math.round(((yearlySavings - implementationCost) / implementationCost) * 100);
    
    // Update results
    document.getElementById('monthlySavings').textContent = formatNumber(totalMonthlySavings) + ' ₽';
    document.getElementById('yearlySavings').textContent = formatNumber(yearlySavings) + ' ₽';
    document.getElementById('timeSaved').textContent = formatNumber(timeSavedHours) + ' часов/мес';
    document.getElementById('roiValue').textContent = roi + '%';
    
    // Update range slider backgrounds
    updateSliderBackground('employees', employees, 5, 500);
    updateSliderBackground('avgSalary', avgSalary, 30000, 200000);
    updateSliderBackground('automationPercent', automationPercent, 10, 80);
    updateSliderBackground('timeReduction', timeReduction, 20, 90);
}

function updateSliderBackground(sliderId, value, min, max) {
    const slider = document.getElementById(sliderId);
    const percentage = ((value - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`;
}

function formatNumber(num) {
    return new Intl.NumberFormat('ru-RU').format(num);
}

// Initialize calculator on page load
document.addEventListener('DOMContentLoaded', function() {
    updateCalculator();
});

// Функция для сброса сессии (очистка памяти)
function resetChatSession() {
    localStorage.removeItem('n8n_session_id');
    // Очищаем чат
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = `
        <div class="message ai-message">
            <div class="message-content">
                Привет! Я ИИ ассистент. Расскажу как автоматизация поможет вашему бизнесу. О чем хотите узнать?
            </div>
            <div class="message-time">Сейчас</div>
        </div>
    `;
}

// Функция для получения текущего session_id (для отладки)
function getCurrentSessionId() {
    return localStorage.getItem('n8n_session_id');
}