// ============================================================
// DOM ELEMENTS
// ============================================================

const cardsContainer = document.getElementById('cardsContainer');
const questionCounter = document.getElementById('questionCounter');
const toast = document.getElementById('toast');

const title = document.querySelector('#title');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const saveDraftBtn = document.getElementById('saveDraftBtn');
const createQuizBtn = document.getElementById('createQuizBtn');
const mainmsg = document.querySelector('#mainmsg');

const LETTERS = ['A', 'B', 'C', 'D'];


// ============================================================
// FUNCTIONS
// ============================================================

function updateCounter() {
    const count = cardsContainer.children.length;
    questionCounter.textContent = `Questions: ${count}`;
}


function autoGrow(input) {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
}


function showToast(message, type = 'default') {

    toast.textContent = message;

    toast.classList.remove(
        'opacity-0',
        'translate-y-4',
        'pointer-events-none'
    );

    toast.classList.add(
        'opacity-100',
        'translate-y-0'
    );

    setTimeout(() => {
        toast.classList.remove(
            'opacity-100',
            'translate-y-0'
        );

        toast.classList.add(
            'opacity-0',
            'translate-y-4',
            'pointer-events-none'
        );
    }, 2500);
}
function updateQuestionNumbers() {
    const cards = cardsContainer.querySelectorAll('.question-card');

    cards.forEach((card, index) => {
        card.querySelector('.question-number').textContent =
            `Question ${index + 1}`;
    });
}

async function createQuestion() {

    const number = cardsContainer.children.length + 1;
    const number2 = cardsContainer.children.length+1;

    const card = document.createElement('div');

    card.className =
        'question-card mt-7 bg-slate-900 border border-white/10 rounded-2.5xl p-5 sm:p-8 shadow-2xl';
    card.id = `maindiv-${number}`;

    card.innerHTML = `

        <div class="flex items-center justify-between mb-5">

            <h2 class="question-number font-semibold text-lg text-violet-50">
                Question ${number2}
            </h2>

            <div>
  <button type="button" class="locked hidden text-red-500 mb-6 w-full sm:w-auto items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-slate-900 font-medium text-sm transition-all duration-200 hover:border-purple-700 hover:bg-slate-800/90 hover:-translate-y-0.5 active:translate-y-0 ">
            Locked
    </button>            <button type="button" onclick="edit(this.closest('.question-card'))" class="edit hover:cursor-pointer mb-6 w-full sm:w-auto items-center justify-center gap-2 py-3.5 px-6 rounded-2xl border border-white/20 bg-slate-900 text-violet-50 font-medium text-sm transition-all duration-200 hover:border-purple-500 hover:bg-slate-800/80 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2">
            Edit
  </button>
    <button type="button" onclick="save(this.closest('.question-card'))" class="save hover:cursor-pointer hidden ml-2 mb-6 w-full sm:w-auto items-center justify-center gap-2 py-3.5 px-6 rounded-2xl border border-white/20 bg-slate-900 text-violet-50 font-medium text-sm transition-all duration-200 hover:border-purple-500 hover:bg-slate-800/80 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2">
            Save
  </button>
    <button type="button" onclick="del(this.closest('.question-card'))" class="dele hover:cursor-pointer ml-2 mb-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl border border-white/20 bg-slate-900 text-violet-50 font-medium text-sm transition-all duration-200 hover:border-purple-500 hover:bg-slate-800/80 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2">
            Delete
  </button>
  </div>

        </div>


        <textarea
            class="question-input w-full min-h-14 resize-none overflow-hidden
            bg-slate-950 border border-white/10 rounded-xl
            py-4 px-4 text-violet-50
            focus:outline-none focus:border-purple-500"
            placeholder="Enter your question here…"
            rows="1"
        ></textarea>

        <p class="question-error hidden text-xs text-rose-500 mt-2">
            Please enter a question.
        </p>


        <div class="options-list flex flex-col gap-3 mt-5">

            ${LETTERS.map((letter, index) => `

                <div
                    class="option-row flex items-center gap-3 py-3 px-4
                    rounded-xl border border-white/10
                    bg-slate-900/60 cursor-pointer"
                    data-index="${index}"
                >

                    <input
                        type="radio"
                        
                        name="correct-${number}"
                        class="correct-radio"
                        value="${letter}"
                    >

                    <span class="option-letter">
                        ${letter}
                    </span>

                    <input
                        type="text"
                        id="option-${letter}"
                        class="option-input flex-1 bg-transparent
                        border-0 text-violet-50
                        focus:outline-none"
                        placeholder="Enter option ${letter}"
                    >

                </div>

            `).join('')}

        </div>

        <p class="options-error hidden text-xs text-rose-500 mt-2"></p>

    `;


    cardsContainer.appendChild(card);

    updateCounter();

    card.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });

    card.querySelector('.question-input').focus();

  return card;
}


function selectCorrectAnswer(row) {

    const card = row.closest('.question-card');

    card.querySelectorAll('.option-row').forEach(option => {

        option.classList.remove(
            'border-purple-500',
            'bg-purple-950/30'
        );

    });

    row.classList.add(
        'border-purple-500',
        'bg-purple-950/30'
    );
}


// function getQuestions() {

//     const questions = [];

//     cardsContainer.querySelectorAll('.question-card').forEach(card => {

//         const question = card
//             .querySelector('.question-input')
//             .value
//             .trim();

//         const options = [...card.querySelectorAll('.option-input')]
//             .map(input => input.value.trim());

//         const correct = card.querySelector('.correct-radio:checked');

//         questions.push({
//             question,
//             options,
//             correct: correct ? correct.value : null
//         });

//     });

//     return questions;
// }




function saveDraft() {

    showToast('Draft saved');
}


function edit(card){
    card.querySelector(`.save`).classList.remove('hidden');
    card.querySelector(`.edit`).classList.add('hidden');


card.querySelector('.question-input').disabled = false;
card.querySelector(`.locked`).classList.add('hidden');

card.querySelector('#option-A').disabled = false;
card.querySelector('#option-B').disabled = false;
card.querySelector('#option-C').disabled = false;
card.querySelector('#option-D').disabled = false;
card.querySelector('.correct-radio').disabled = false;

card.querySelector('.question-input').classList.remove('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-A').classList.remove('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-B').classList.remove('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-C').classList.remove('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-D').classList.remove('cursor-not-allowed' , 'pointer-events-none'); 

}

async function save(card){
    const response = await fetch('/edit',{

      method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: card.querySelector('.question-input').value , quesid:card.querySelector('.question-input').id, option_a: card.querySelector('#option-A').value, option_b: card.querySelector('#option-B').value, option_c: card.querySelector('#option-C').value, option_d: card.querySelector('#option-D').value , correct: card.querySelector('.correct-radio:checked') ? card.querySelector('.correct-radio:checked').value : null })

    });
    if (response.status===500){
      showToast('Some error occured');
return;
    }
    const data = await response.json();
    if(data.success){
        card.querySelector('.question-input').disabled = true;
        card.querySelector(`.locked`).classList.remove('hidden');

card.querySelector('#option-A').disabled =true;
card.querySelector('#option-B').disabled = true;
card.querySelector('#option-C').disabled = true;
card.querySelector('#option-D').disabled = true;
card.querySelector('.correct-radio').disabled = true;
card.querySelector('.question-input').classList.add('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-A').classList.add('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-B').classList.add('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-C').classList.add('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-D').classList.add('cursor-not-allowed' , 'pointer-events-none');
showToast('Saved');
}
}

async function del(card) {

    const response = await fetch('/delques', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            quesid: card.querySelector('.question-input').id
        })
    });

    if (response.status === 500) {
        showToast('Some error occured');
        return;
    }

    const data = await response.json();
if(data.success==='half'){
      card.remove();                 // remove from UI
        updateQuestionNumbers();       // update displayed numbers
        updateCounter();                // update "Questions: X"
        showToast('Deleted');
}
    if (data.success) {
        card.remove();                 // remove from UI
        updateQuestionNumbers();       // update displayed numbers
        updateCounter();                // update "Questions: X"
        showToast('Deleted');
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// Add question

addQuestionBtn.addEventListener('click', async()=>{

    if(!cardsContainer.lastElementChild){
        createQuestion();
return;
    }
  const card = cardsContainer.lastElementChild;

    const response = await fetch('/quiz/question', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: card.querySelector('.question-input').value ,uuid:uuid, option_a: card.querySelector('#option-A').value, option_b: card.querySelector('#option-B').value, option_c: card.querySelector('#option-C').value, option_d: card.querySelector('#option-D').value , correct: card.querySelector('.correct-radio:checked') ? card.querySelector('.correct-radio:checked').value : null })

    });
    if (response.status===500){
      showToast('Some error occured');
return;
    }
    const data = await response.json();
    if(data.success){
        card.querySelector('.question-input').disabled = true;

        card.querySelector('.question-input').id = data.quesid;
card.querySelector('#option-A').disabled =true;
card.querySelector(`.locked`).classList.remove('hidden');
card.querySelector('#option-B').disabled = true;
card.querySelector('#option-C').disabled = true;
card.querySelector('#option-D').disabled = true;
card.querySelector('.correct-radio').disabled = true;
card.querySelector('.question-input').classList.add('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-A').classList.add('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-B').classList.add('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-C').classList.add('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-D').classList.add('cursor-not-allowed' , 'pointer-events-none');
showToast('Saved');
createQuestion();
    }
});


// Save draft

saveDraftBtn.addEventListener('click', saveDraft);


// Create quiz

createQuizBtn.addEventListener('click', async()=>{
  const card = cardsContainer.lastElementChild;

    const response = await fetch('/quizsubmit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: card.querySelector('.question-input').value ,total:cardsContainer.length() ,uuid:uuid ,title:title.value, option_a: card.querySelector('#option-A').value, option_b: card.querySelector('#option-B').value, option_c: card.querySelector('#option-C').value, option_d: card.querySelector('#option-D').value , correct: card.querySelector('.correct-radio:checked') ? card.querySelector('.correct-radio:checked').value : null })

    });
    if (response.status===500){
      showToast('Some error occured');
return;
    }
    const data = await response.json();
    if(data.success){

        showToast('Quiz Saved successfully');
        setTimeout(()=>{
            window.location.href= '/viewquiz';
        },2000);
        card.querySelector('.question-input').disabled = true;

        card.querySelector('.question-input').id = data.quesid;
card.querySelector('#option-A').disabled =true;
card.querySelector(`.locked`).classList.remove('hidden');
card.querySelector('#option-B').disabled = true;
card.querySelector('#option-C').disabled = true;
card.querySelector('#option-D').disabled = true;
card.querySelector('.correct-radio').disabled = true;
card.querySelector('.question-input').classList.add('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-A').classList.add('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-B').classList.add('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-C').classList.add('cursor-not-allowed' , 'pointer-events-none');
card.querySelector('#option-D').classList.add('cursor-not-allowed' , 'pointer-events-none');

    }


});
let uuid;

window.addEventListener('DOMContentLoaded' , async()=>{
  const response = await fetch('/genuuid' ,{
     method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ abc:"getuuid" })

    });
    const data = await response.json();
    if(data.success){
    uuid = data.uuid;
    }

});

// Dynamic events inside question cards

cardsContainer.addEventListener('input', (event) => {

    if (event.target.classList.contains('question-input')) {
        autoGrow(event.target);
    }

});


// Correct answer selection

cardsContainer.addEventListener('change', (event) => {

    if (event.target.classList.contains('correct-radio')) {

        const row = event.target.closest('.option-row');

        selectCorrectAnswer(row);
    }

});


// Clicking option row

cardsContainer.addEventListener('click', (event) => {

    const row = event.target.closest('.option-row');

    if (!row) return;

    if (event.target.classList.contains('option-input')) {
        return;
    }

    const radio = row.querySelector('.correct-radio');

    radio.checked = true;

    selectCorrectAnswer(row);
});


// ============================================================
// INITIAL QUESTION
// ============================================================

createQuestion();