const Chat =
  document.querySelector('.chat') || throwError('Chat element not found');
const Form =
  document.querySelector('.form') || throwError('Form element not found');
const Input =
  Form.querySelector('.input') || throwError('Input element not found');
const Container =
  document.querySelector('.container') ||
  throwError('Container element not found');
const fileinput =
  Form.querySelector('#file-input') ||
  throwError('File input element not found');
const Upload =
  Form.querySelector('.upload') || throwError('Upload element not found');
const Theme =
  document.querySelector('#themebtn') || throwError('Theme button not found');

function throwError(message) {
  throw new Error(message);
}

// API setup
// Move to server-side for security
const API_URL = 'http://localhost:8000/api/gemini';

let controller;
const history = [];
const userData = { message: '', file: {} };

// Function to create message elements
const createMsgElement = (content, ...classes) => {
  const div = document.createElement('div');
  div.classList.add('message', ...classes);
  div.innerHTML = content;
  return div;
};

// Scroll to the bottom of the container
const scrollToBottom = () =>
  Container.scrollTo({ top: Container.scrollHeight, behavior: 'smooth' });

// Simulate typing effect for bot responses
const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = '';
  const words = text.split(' ');
  let wordIndex = 0;

  const typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent +=
        (wordIndex === 0 ? '' : ' ') + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove('loading');
      document.body.classList.remove('bot-responding');
    }
  }, 40);
};

// Make the API call and generate the bot's response
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector('.textmessage');
  controller = new AbortController();

  history.push({
    role: 'user',
    parts: [
      { text: userData.message },
      ...(userData.file.data
        ? [
            {
              inline_data: {
                mime_type: userData.file.mime_type,
                data: userData.file.data,
              },
            },
          ]
        : []),
    ],
  });

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: history }),
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error?.message || 'API request failed');

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text
      ? data.candidates[0].content.parts[0].text
          .replace(/\\([^\*]+)\*/g, '$1')
          .trim()
      : 'Error: No response text available';
    typingEffect(responseText, textElement, botMsgDiv);

    history.push({ role: 'model', parts: [{ text: responseText }] });
  } catch (error) {
    textElement.style.color = '#d62939';
    textElement.textContent =
      error.name === 'AbortError'
        ? 'Response generation stopped.'
        : error.message;
    botMsgDiv.classList.remove('loading');
    document.body.classList.remove('bot-responding');
  } finally {
    userData.file = {};
  }
};

// Handle the form submission
const handleForm = (e) => {
  e.preventDefault();
  const userMessage = Input.value.trim();
  if (!userMessage || document.body.classList.contains('bot-responding'))
    return;

  Input.value = '';
  userData.message = userMessage;
  document.body.classList.add('bot-responding', 'chats-active');
  Upload.classList.remove('active', 'img-attached', 'file-attached');

  const userMsgHTML = `<p class="textmessage"></p>
    ${
      userData.file.data
        ? userData.file.isimage
          ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`
          : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`
        : ''
    }`;

  const userMsgDiv = createMsgElement(userMsgHTML, 'usermessage');
  userMsgDiv.querySelector('.textmessage').textContent = userMessage;
  Chat.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    const botMsgHTML = `<img src="logo.svg" class="avatar"><p class="textmessage">Just a sec....</p>`;
    const botMsgDiv = createMsgElement(botMsgHTML, 'botmessage', 'loading');
    Chat.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 400);
};

// Handle file input change (file upload)
fileinput.addEventListener('change', () => {
  const file = fileinput.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert('File size exceeds 5MB limit.');
    return;
  }

  const isimage = file.type.startsWith('image/');
  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = (e) => {
    fileinput.value = '';
    const base64String = e.target.result.split(',')[1];
    Upload.querySelector('.preview').src = e.target.result;
    Upload.classList.add('active', isimage ? 'img-attached' : 'file-attached');

    userData.file = {
      fileName: file.name,
      data: base64String,
      mime_type: file.type,
      isimage,
    };
  };

  reader.onerror = () => {
    alert('Error reading file.');
    Upload.classList.remove('active', 'img-attached', 'file-attached');
  };
});

// Cancel File Upload
document.querySelector('#cancelfilebtn').addEventListener('click', () => {
  userData.file = {};
  Upload.classList.remove('active', 'img-attached', 'file-attached');
});

// Stop ongoing bot response
document.querySelector('#stopbtn').addEventListener('click', () => {
  userData.file = {};
  controller?.abort();
  const botMsgDiv = Chat.querySelector('.botmessage.loading');
  if (botMsgDiv) botMsgDiv.classList.remove('loading');
  document.body.classList.remove('bot-responding', 'chats-active');
});

// Delete all chats
document.querySelector('#deletebtn').addEventListener('click', () => {
  history.length = 0;
  Chat.innerHTML = '';
  document.body.classList.remove('bot-responding', 'chats-active');
});

// Handle suggestions click
document.querySelectorAll('.item').forEach((a) => {
  a.addEventListener('click', () => {
    Input.value = a.querySelector('.text').textContent;
    Form.dispatchEvent(new Event('submit'));
  });
});

// Show/hide controls for mobile on prompt input focus
document.addEventListener('click', ({ target }) => {
  const w = document.querySelector('.wrapper');
  const shouldHide =
    target.classList.contains('input') ||
    (w.classList.contains('hide-controls') &&
      (target.id === 'addfilebtn' || target.id === 'stopbtn'));
  w.classList.toggle('hide-controls', shouldHide);
});

// Toggle dark/light theme
Theme.addEventListener('click', () => {
  const islight = document.body.classList.toggle('light-theme');
  localStorage.setItem('themeColor', islight ? 'light_mode' : 'dark_mode');
  Theme.textContent = islight ? 'dark_mode' : 'light_mode';
});

// Set initial theme from local storage
const islight = localStorage.getItem('themeColor') === 'light_mode';
document.body.classList.toggle('light-theme', islight);
Theme.textContent = islight ? 'dark_mode' : 'light_mode';

Form.addEventListener('submit', handleForm);
Form.querySelector('#addfilebtn').addEventListener('click', () =>
  fileinput.click()
);
