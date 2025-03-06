const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const TELEGRAM_BOT_TOKEN = "7919016278:AAHr3NJOeARpAYV8IeXvgQyiwFWENrPe23A";
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Подключение к MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "sysadmin",
  password: "D270c1E528b750D5",
  database: "quiz_helper"
});

db.connect(err => {
  if (err) throw err;
  console.log("✅ Подключено к базе данных");
});

// Функция регистрации пользователя
const registerUser = (chatId, username) => {
  db.query("SELECT * FROM users WHERE chat_id = ?", [chatId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      db.query("INSERT INTO users (chat_id, username, balance) VALUES (?, ?, 5)", [chatId, username], (err) => {
        if (err) throw err;
        bot.sendMessage(chatId, "✅ Вы успешно зарегистрированы! Вам начислено 5 баллов.");
      });
    } else {
      bot.sendMessage(chatId, "⚠️ Вы уже зарегистрированы.");
    }
  });
};

// Функция проверки баланса
const getBalance = (chatId) => {
  db.query("SELECT balance FROM users WHERE chat_id = ?", [chatId], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      bot.sendMessage(chatId, `💰 Ваш баланс: ${results[0].balance} баллов.`);
    } else {
      bot.sendMessage(chatId, "❌ Вы не зарегистрированы. Нажмите 'Зарегистрироваться'.");
    }
  });
};

// Функция для генерации QR-кода
const generateQRCode = async (chatId, amount) => {
  const paymentUrl = `https://vtb.paymo.ru/collect-money/qr/?transaction=bebb0eeb-241a-4cd3-82bc-0db42cced4ff&amount=${amount}`;
  
  QRCode.toFile('qrcode.png', paymentUrl, (err) => {
    if (err) {
      console.error("Ошибка при генерации QR-кода:", err);
      return;
    }

    bot.sendPhoto(chatId, path.join(__dirname, 'qrcode.png'), { 
      caption: `Сканируйте QR-код для оплаты ${amount} руб. через СБП.`
    }).catch((error) => {
      console.error("Ошибка при отправке фото:", error);
    });
  });
};

// Функция автоматического зачисления баллов после оплаты
const addBalanceAfterPayment = (chatId, amount) => {
  db.query("UPDATE users SET balance = balance + ? WHERE chat_id = ?", [amount / 10, chatId], (err) => {
    if (err) throw err;
    bot.sendMessage(chatId, `✅ Оплата подтверждена! Вам зачислено ${amount / 10} баллов.`);
  });
};

// Главное меню
const mainMenu = {
  reply_markup: {
    keyboard: [["Зарегистрироваться"], ["Купить баллы"], ["Узнать баланс баллов"]],
    resize_keyboard: true
  }
};

// Подменю покупки баллов
const buyMenu = {
  reply_markup: {
    keyboard: [["10 баллов - 100 руб."], ["20 баллов - 200 руб."], ["50 баллов - 500 руб."], ["Vip - 1000 руб."], ["⬅ Назад"]],
    resize_keyboard: true
  }
};

// Обработчики команд
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  switch (text) {
    case "Зарегистрироваться":
      registerUser(chatId, msg.chat.username || "unknown");
      break;
    case "Купить баллы":
      bot.sendMessage(chatId, "Выберите количество баллов:", buyMenu);
      break;
    case "Узнать баланс баллов":
      getBalance(chatId);
      break;
    case "10 баллов - 100 руб.":
      generateQRCode(chatId, 100);
      break;
    case "20 баллов - 200 руб.":
      generateQRCode(chatId, 200);
      break;
    case "50 баллов - 500 руб.":
      generateQRCode(chatId, 500);
      break;
    case "Vip - 1000 руб.":
      generateQRCode(chatId, 1000);
      break;
    case "⬅ Назад":
      bot.sendMessage(chatId, "Главное меню", mainMenu);
      break;
    default:
      bot.sendMessage(chatId, "🔹 Выберите действие:", mainMenu);
      break;
  }
});

bot.on('polling_error', (error) => {
  console.error("Ошибка при polling:", error);
});

console.log("🤖 Бот запущен...");