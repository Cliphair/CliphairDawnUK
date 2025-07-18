// const queries = window.location.search;          //comment when testing
// const urlParams = new URLSearchParams(queries);  //comment when testing
// const validated = (urlParams.has('validated'));  //comment when testing
const validated = true; // uncomment when testing

// Quiz just works if email validated before
if(validated){ 
  removeParametersFromURL();
  document.querySelector( "#quiz" ).style=''; 
  
  // Add click event to the answers
  let answerButtons = document.getElementsByClassName('answer');
  for(button of answerButtons){
    button.addEventListener('click', function(){
      addAnswers(this);
      nextQuestion(this);
    })
  }
  
  // Add click event to the last answers that trigger finalMessage()
  let finalButtons = document.querySelector('.last_question').querySelectorAll('.answer');
  for(button of finalButtons){
    button.addEventListener('click', function(){
      finalMessage();
    })
  }
  
  // Add click event to back button
  let backBtn = document.getElementsByClassName('back_btn')[0];
  backBtn.addEventListener('click', function(){
    previousQuestion();
  })
}
else{
  window.alert('You need to validate your email first! :)');
  window.location.replace("https://www.cliphair.co.uk/pages/quiz-form");   
}

// Remove parameters from the URL
function removeParametersFromURL(){
  let currentUrl = window.location.href;
  
  let nextTitle = document.title;
  let nextState = {};
  let nextUrl = ''
  if (currentUrl.indexOf('?') !== -1){
    nextUrl = currentUrl.split('?')[0];
  } else{
    nextUrl = currentUrl;
  }

  window.history.pushState(nextState, nextTitle, nextUrl);
}

const userAnswers = {};

// Add selected answers to userAnswers object
function addAnswers(clickedObject){
  let question = clickedObject.dataset.question;
  let answer = clickedObject.dataset.answer;

  userAnswers[question] = answer;
}

// Remove the passed class from the passed element
function removeClass(element, className){
  element.classList.remove(className)
}

// Add the passed class to the passed element
function addClass(element, className){
  element.classList.add(className)
}

// Update the questions counter
function updateCounter(newValue){
  let counter = document.getElementById('question_counter');
  counter.innerText = newValue;
}

// Scroll the page to the top
function scrollToTop(){
  document.body.scrollTop = 100; // For Safari
  document.documentElement.scrollTop = 100; // For Chrome, Firefox, IE and Opera
}

// Make back button visible on the page
function addBackButton(){
  let backBtn = document.getElementsByClassName('back_btn')[0];
  removeClass(backBtn, 'hidden_btn');
}

// Make back button invisible on the page
function removeBackButton(){
  let backBtn = document.getElementsByClassName('back_btn')[0];
  addClass(backBtn, 'hidden_btn');
}

// Change question displayed to the next one
function nextQuestion(clickedObject){
  let currentContainer = clickedObject.parentNode.parentNode;

  let nextQuestion = currentContainer.dataset.next;
  let nextContainer = document.querySelector("[data-current='"+nextQuestion+"']");

  // Just run the functions if next question exist.
  if(nextQuestion <= numberOfQuestions){
    removeClass(currentContainer, 'active');
    addClass(nextContainer, 'active');
    updateCounter(nextQuestion);
    scrollToTop();
  }

  // Add the back button just after the first question
  if (nextQuestion === '2'){
    addBackButton();
  }
}

// Change question displayed to the previous one
function previousQuestion(){
  let currentContainer = document.querySelector('.question_container.active');

  let previousQuestion = currentContainer.dataset.previous;
  let previousContainer = document.querySelector("[data-current='"+previousQuestion+"']");

  removeClass(currentContainer, 'active');
  addClass(previousContainer, 'active');
  updateCounter(previousQuestion);
  scrollToTop();

  // Remove back button when first question displayed
  if (previousQuestion === '1'){
    removeBackButton();
  }
}

// Return how many answers are correct
function returnCorrectAnswers(){
  let corrects = 0;
  for(let i = 1; i <= numberOfQuestions; i++){
    let question = 'q' + i;
    if(userAnswers[question] === answers[question]){
      corrects++;
    }
  }
  return corrects
}

// Return HTML with correct or wrong elements based on the answers
function displayAnswersHTML(){
  let container = document.createElement('div');
  
  for(let i = 1; i <= numberOfQuestions; i++){
    let question = 'q' + i;
    if(userAnswers[question] === answers[question]){
      container.innerHTML += `<p><span>${i}.</span> <span class='answer_box correct'><svg
  class="icon icon-checkmark"
  aria-hidden="true"
  focusable="false"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 12 9"
  fill="none"
>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M11.35.643a.5.5 0 01.006.707l-6.77 6.886a.5.5 0 01-.719-.006L.638 4.845a.5.5 0 11.724-.69l2.872 3.011 6.41-6.517a.5.5 0 01.707-.006h-.001z" fill="currentColor"/>
</svg>
</span></p>`
    }else{
      container.innerHTML += `<p><span>${i}.</span> <span class='answer_box wrong'><svg
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
  focusable="false"
  class="icon icon-close"
  fill="none"
  viewBox="0 0 18 17"
>
  <path d="M.865 15.978a.5.5 0 00.707.707l7.433-7.431 7.579 7.282a.501.501 0 00.846-.37.5.5 0 00-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 10-.707-.708L8.991 7.853 1.413.573a.5.5 0 10-.693.72l7.563 7.268-7.418 7.417z" fill="currentColor">
</svg></span></p>`
    }
  }

  return container.innerHTML
}

// Return HTML with correct or wrong elements based on the answers
function displayExplanationHTML(){
  let container = document.createElement('div');
  
  for(let i = 1; i <= numberOfQuestions; i++){
    let question = 'q' + i;
    if(userAnswers[question] !== answers[question]){
      let questionContainer = document.createElement('div');
      questionContainer.className = "question-container";
      questionContainer.innerHTML = `<p class='question'>Question ${i}</p>`;
      questionContainer.innerHTML += explanationArray[question];

      container.append(questionContainer);
    }
  }

  return container.innerHTML
}

// Return the final message based on how many correct answers
function retunrMessage(correctAnswers, questions){
  if (correctAnswers >= 10){
    return  `
      <h2 class='code'>Code: <a href='https://www.cliphair.co.uk/discount/MANECRUSH20' target='_self' title='£20 Off Code (MANECRUSH20)'>MANECRUSH20</a></h2>
      <p class='discount_info'>(click to automatically apply)</p>
      <p>Congratulations! You scored ${correctAnswers} out of ${questions}.</p>
      <div class='answers_display'>${displayAnswersHTML()}</div>
      <p>Please use the discount code at checkout when you are ready to purchase for £20 off your order.</p>
      <p>* Code valid until 24/12/2023</p>
      <!-- <div class='explanation-outer'>
        <p id='dropdown-btn'><span class='sign'>+</span> Check What You Got Wrong <span class='sub-text'>(click to open)</span></p>
        <div class='explanation-inner hidden'>
          ${displayExplanationHTML()}
        </div>
      </div> -->
    `
  }
  else if(correctAnswers >= 7){
    return `
      <h2 class='code'>Code: <a href='https://www.cliphair.co.uk/discount/HAIRWIZ15' target='_self' title='£15 Off Code (HAIRWIZ15)'>HAIRWIZ15</a></h2>
      <p class='discount_info'>(click to automatically apply)</p>
      <p>Congratulations! You scored ${correctAnswers} out of ${questions}.</p>
      <div class='answers_display'>${displayAnswersHTML()}</div>
      <p>Please use the discount code at checkout when you are ready to purchase for £15 off your order.</p>
      <p>* Code valid until 24/12/2023</p>
      <!-- <div class='explanation-outer'>
        <p id='dropdown-btn'><span class='sign'>+</span> Check What You Got Wrong <span class='sub-text'>(click to open)</span></p>
        <div class='explanation-inner hidden'>
          ${displayExplanationHTML()}
        </div>
      </div> -->
    `
  }
  else if(correctAnswers >= 4 ){
    return `
      <h2 class='code'>Code: <a href='https://www.cliphair.co.uk/discount/TRESS10' target='_self' title='£10 Off Code (TRESS10)'>TRESS10</a></h2>
      <p class='discount_info'>(click to automatically apply)</p>
      <p>Congratulations! You scored ${correctAnswers} out of ${questions}.</p>
      <div class='answers_display'>${displayAnswersHTML()}</div>
      <p>Please use the discount code at checkout when you are ready to purchase for £10 off your order.</p>
      <p>* Code valid until 24/12/2023</p>
      <!-- <div class='explanation-outer'>
        <p id='dropdown-btn'><span class='sign'>+</span> Check What You Got Wrong <span class='sub-text'>(click to open)</span></p>
        <div class='explanation-inner hidden'>
          ${displayExplanationHTML()}
        </div>
      </div> -->
    `
  }
  else if(correctAnswers >= 1){
    return `
      <h2 class='code'>Code: <a href='https://www.cliphair.co.uk/discount/QUIZ5' target='_self' title='£5 Off Code (QUIZ5)'>QUIZ5</a></h2>
      <p class='discount_info'>(click to automatically apply)</p>
      <p>Congratulations! You scored ${correctAnswers} out of ${questions}.</p>
      <div class='answers_display'>${displayAnswersHTML()}</div>
      <p>Please use the discount code at checkout when you are ready to purchase for £5 off your order.</p>
      <p>* Code valid until 24/12/2023</p>
      <!-- <div class='explanation-outer'>
        <p id='dropdown-btn'><span class='sign'>+</span> Check What You Got Wrong <span class='sub-text'>(click to open)</span></p>
        <div class='explanation-inner hidden'>
          ${displayExplanationHTML()}
        </div>
      </div> -->
    `
  }
  else{
    return `
      <p>Sorry, you didn't make enough points to get a discount.</p>
      <div class='answers_display'>${displayAnswersHTML()}</div>
      <!-- <div class='explanation-outer'>
        <p id='dropdown-btn'><span class='sign'>+</span> Check What You Got Wrong <span class='sub-text'>(click to open)</span></p>
        <div class='explanation-inner hidden'>
          ${displayExplanationHTML()}
        </div>
      </div> -->
    `
  }
}

// Display final message to the user
function finalMessage(){
  let container = document.getElementById('quiz');
  let questions = numberOfQuestions;
  let correctAnswers = returnCorrectAnswers();
  
  container.innerHTML = retunrMessage(correctAnswers, questions);
  addDropdownFunction()
}

// dropdown functions
function addDropdownFunction(){
  let button = document.getElementById('dropdown-btn');
  button.addEventListener('click', openAndClose);
}

function openAndClose(){
  let currentStatus = document.getElementsByClassName('sign')[0].innerText;

  document.getElementsByClassName('explanation-inner')[0].classList.toggle('hidden');

  if(currentStatus === '+'){
    document.getElementsByClassName('sign')[0].innerText = '-'
    document.getElementsByClassName('sub-text')[0].innerText = '(click to close)'
  } else{
    document.getElementsByClassName('sign')[0].innerText = '+'
    document.getElementsByClassName('sub-text')[0].innerText = '(click to open)'
  }
}