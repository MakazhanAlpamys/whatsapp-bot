import { GoogleGenAI } from "@google/genai/node";
import dotenv from 'dotenv';

dotenv.config();

class GeminiService {
  constructor() {
    this.ai = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }

      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
      });

      this.isInitialized = true;
      console.log('✅ Gemini AI service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  async detectLanguage(messages) {
    if (!this.isInitialized) {
      throw new Error('Gemini AI service not initialized');
    }

    try {
      // Take more messages for better language detection (up to 50)
      const sampleMessages = messages.slice(0, 50).map(msg => msg.message_text).join(' ');
      
      const prompt = `
Analyze the following text from a WhatsApp group chat and determine the PRIMARY language used by the majority of participants.

Rules:
- If the chat is mixed language, determine which language is used MOST FREQUENTLY
- Consider both message content and typical patterns
- Respond with ONLY the language name in English (e.g., "Russian", "English", "Spanish", "French", "German", "Chinese", "Arabic", etc.)
- If it's clearly mixed with no dominant language, default to "English"

Text sample: ${sampleMessages}
      `;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const detectedLang = response.text.trim();
      console.log(`🌍 Detected primary language: ${detectedLang}`);
      return detectedLang;
    } catch (error) {
      console.error('❌ Failed to detect language:', error.message);
      return 'English'; // Default fallback
    }
  }

  async generateDailyReport(messages) {
    if (!this.isInitialized) {
      throw new Error('Gemini AI service not initialized');
    }

    try {
      // Detect language first
      const detectedLanguage = await this.detectLanguage(messages);
      console.log(`🌍 Detected language: ${detectedLanguage}`);

      const messageText = messages.map(msg => 
        `[${msg.created_at}] ${msg.user_name}: ${msg.message_text}`
      ).join('\n');

      // Create language-specific prompts for business reports
      const prompts = {
        'Russian': `
Проанализируйте следующие сообщения WhatsApp группы за последние 24 часа и создайте МАКСИМАЛЬНО ДЕТАЛЬНЫЙ деловой отчет.

ВАЖНО: Отвечайте строго на русском языке.

Сообщения:
${messageText}

Создайте ДЕТАЛИЗИРОВАННЫЙ структурированный деловой отчет со следующими разделами:

1. **📊 ДЕТАЛЬНАЯ СТАТИСТИКА АКТИВНОСТИ**
   - Общее количество сообщений (укажите точное число)
   - Количество активных участников (полный список)
   - ТОП-5 самых активных участников с точным количеством сообщений каждого
   - Часы пиковой активности (укажите конкретные временные промежутки)
   - Средняя длина сообщений (в словах)
   - Самое длинное и самое короткое сообщение
   - Процент текстовых vs медиа сообщений
   - Распределение активности по часам (если возможно)

2. **🎯 ПОДРОБНЫЙ АНАЛИЗ ТЕМ И ПРОЕКТОВ**
   - Сгруппируйте ВСЕ сообщения по рабочим темам/проектам
   - Для КАЖДОЙ темы укажите:
     * Количество сообщений
     * Ключевые участники обсуждения
     * Основные моменты и выводы
     * Статус обсуждения
   - Выделите приоритетные задачи с деталями
   - Отметьте завершенные задачи и кем они выполнены
   - Незавершенные задачи и причины

3. **👥 ПОЛНЫЙ АНАЛИЗ УЧАСТНИКОВ**
   - ПОЛНЫЙ список ВСЕХ участников с количеством сообщений (отсортировано по убыванию)
   - Для каждого активного участника укажите:
     * Количество сообщений
     * Основные темы, которые они обсуждали
     * Их роль в обсуждениях (инициатор, исполнитель, комментатор)
   - Новые участники (если есть)
   - Неактивные участники (кто молчал)
   - Время активности каждого участника

4. **📈 КЛЮЧЕВЫЕ РЕШЕНИЯ И РЕЗУЛЬТАТЫ**
   - ВСЕ принятые решения с полным описанием
   - ВСЕ назначенные задачи с указанием:
     * Кто назначил
     * Кому назначена
     * Сроки выполнения
     * Текущий статус
   - Дедлайны и важные даты
   - Достигнутые результаты (подробно)
   - Все проблемы и их решения (детально)
   - Открытые вопросы, требующие решения

5. **💬 ДЕТАЛЬНЫЙ АНАЛИЗ КОММУНИКАЦИИ**
   - Стиль общения (формальный/неформальный)
   - Тон дискуссий (позитивный/негативный/нейтральный)
   - Уровень вовлеченности команды
   - Скорость реакции на сообщения
   - Качество обратной связи
   - Конфликты или разногласия (если были)

6. **🔍 ГЛУБОКИЕ ИНСАЙТЫ И ПАТТЕРНЫ**
   - Повторяющиеся темы или вопросы
   - Тренды в обсуждениях
   - Паттерны активности участников
   - Эффективность коммуникации (что работает, что нет)
   - Узкие места и проблемы процессов
   - Возможности для улучшения

7. **⚡ ВАЖНЫЕ МОМЕНТЫ И АКЦЕНТЫ**
   - Критически важные сообщения или решения
   - Срочные вопросы, требующие внимания
   - Риски и предупреждения
   - Возможности, которые нельзя упустить

8. **📋 ПЛАНЫ И СЛЕДУЮЩИЕ ШАГИ**
   - Все запланированные встречи с деталями (время, участники, цель)
   - Все предстоящие задачи с приоритетами
   - Важные даты и события на ближайшее время
   - Конкретные рекомендации на следующий день
   - Action items для каждого участника

9. **📝 ИТОГОВОЕ РЕЗЮМЕ**
   - Главные достижения за день
   - Основные проблемы
   - Ключевые выводы
   - Общий прогресс по проектам

Формат отчета:
- Используйте МАКСИМАЛЬНО четкую структуру с заголовками
- Добавляйте ВСЕ конкретные цифры и факты
- Выделяйте важную информацию *жирным шрифтом*
- Не пропускайте детали - включайте всю значимую информацию
- Используйте эмодзи для разделения секций
- Пишите в профессиональном деловом стиле
- Если информации по разделу нет - так и напишите
- Максимум 4000 символов

Будьте максимально детальны и конкретны!

Отвечай на русском языке.
        `,
        'English': `
Analyze the following WhatsApp group messages from the last 24 hours and create a MAXIMALLY DETAILED business report.

IMPORTANT: Respond in English.

Messages:
${messageText}

Create a COMPREHENSIVE structured business report with the following sections:

1. **📊 DETAILED ACTIVITY STATISTICS**
   - Total message count (exact number)
   - Number of active participants (full list)
   - TOP-5 most active participants with exact message counts for each
   - Peak activity hours (specify exact time ranges)
   - Average message length (in words)
   - Longest and shortest messages
   - Percentage of text vs media messages
   - Activity distribution by hours (if possible)

2. **🎯 COMPREHENSIVE TOPICS & PROJECTS ANALYSIS**
   - Group ALL messages by work topics/projects
   - For EACH topic specify:
     * Message count
     * Key discussion participants
     * Main points and conclusions
     * Discussion status
   - Highlight priority tasks with details
   - Note completed tasks and who completed them
   - Incomplete tasks and reasons

3. **👥 FULL PARTICIPANT ANALYSIS**
   - COMPLETE list of ALL participants with message counts (sorted descending)
   - For each active participant specify:
     * Number of messages
     * Main topics they discussed
     * Their role in discussions (initiator, executor, commentator)
   - New participants (if any)
   - Inactive participants (who stayed silent)
   - Activity time for each participant

4. **📈 KEY DECISIONS AND RESULTS**
   - ALL decisions made with full description
   - ALL assigned tasks specifying:
     * Who assigned
     * Assigned to whom
     * Deadlines
     * Current status
   - Deadlines and important dates
   - Achieved results (detailed)
   - All problems and their solutions (detailed)
   - Open questions requiring resolution

5. **💬 DETAILED COMMUNICATION ANALYSIS**
   - Communication style (formal/informal)
   - Discussion tone (positive/negative/neutral)
   - Team engagement level
   - Response speed to messages
   - Feedback quality
   - Conflicts or disagreements (if any)

6. **🔍 DEEP INSIGHTS AND PATTERNS**
   - Recurring themes or questions
   - Discussion trends
   - Participant activity patterns
   - Communication effectiveness (what works, what doesn't)
   - Process bottlenecks and issues
   - Improvement opportunities

7. **⚡ IMPORTANT MOMENTS & HIGHLIGHTS**
   - Critically important messages or decisions
   - Urgent matters requiring attention
   - Risks and warnings
   - Opportunities not to be missed

8. **📋 PLANS AND NEXT STEPS**
   - All scheduled meetings with details (time, participants, purpose)
   - All upcoming tasks with priorities
   - Important dates and events coming up
   - Specific recommendations for tomorrow
   - Action items for each participant

9. **📝 EXECUTIVE SUMMARY**
   - Main achievements of the day
   - Key problems
   - Key takeaways
   - Overall project progress

Report format:
- Use MAXIMALLY clear structure with headers
- Add ALL specific numbers and facts
- Highlight important information in *bold*
- Don't skip details - include all significant information
- Use emojis for section separation
- Write in professional business style
- If no information for a section - state so clearly
- Maximum 4000 characters

Be maximally detailed and specific!

Respond in English.
        `
      };

      const prompt = prompts[detectedLanguage] || prompts['English'];

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error('❌ Failed to generate daily report:', error.message);
      throw error;
    }
  }

  async answerQuestion(question, messages) {
    if (!this.isInitialized) {
      throw new Error('Gemini AI service not initialized');
    }

    try {
      // Detect language from messages
      const detectedLanguage = await this.detectLanguage(messages);
      console.log(`🌍 Detected language for Q&A: ${detectedLanguage}`);

      const messageText = messages.map(msg => 
        `[${msg.created_at}] ${msg.user_name}: ${msg.message_text}`
      ).join('\n');

      const prompt = `
Based on the following WhatsApp group messages from the last 14 days, please answer this question: "${question}"

IMPORTANT: Respond in ${detectedLanguage} language. All text should be in ${detectedLanguage}.

Group Messages Context:
${messageText}

Instructions:
- Use only the information from the provided messages
- If the question cannot be answered from the context, say so politely in ${detectedLanguage}
- Provide specific examples or quotes when relevant
- Keep the response concise and helpful (max 1500 characters)
- Format it nicely for WhatsApp with proper line breaks
- Use emojis appropriately
- Write in professional business style
- If the question is in a different language than ${detectedLanguage}, still respond in ${detectedLanguage}
- Include specific data, numbers, and facts when available

Question: ${question}

Respond in: ${detectedLanguage}
      `;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error('❌ Failed to answer question:', error.message);
      throw error;
    }
  }

  async testConnection() {
    if (!this.isInitialized) {
      return false;
    }

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Say 'Hello, I am working!' in exactly those words.",
      });

      console.log('✅ Gemini AI test successful:', response.text);
      return true;
    } catch (error) {
      console.error('❌ Gemini AI test failed:', error.message);
      return false;
    }
  }
}

export default new GeminiService();
