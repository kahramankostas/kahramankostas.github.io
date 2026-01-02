
// YouTube API'si yüklendiğinde çağrılacak fonksiyon
let player;
let playerState = -1;
let currentTime = 0;
let questionsShown = [];
let score = 0;
let checkInterval;
let totalQuestions = 3;

// Soruların listesi
const questions = [

    
  {
    "time": 180,
    "question": "Bu malzemelerle yapabilece\u011finiz Bursa yeme\u011fi hangisidir? 500 gr k\u0131yma, 3 adet kebapl\u0131k pide, 250 gr tereya\u011f\u0131, 250 gr yo\u011furt, 1 \u00e7ay ka\u015f\u0131\u011f\u0131 kimyon, 1 \u00e7ay ka\u015f\u0131\u011f\u0131 karabiber, 1 \u00e7ay ka\u015f\u0131\u011f\u0131 tuz, 1 yemek ka\u015f\u0131\u011f\u0131 domates sal\u00e7as\u0131",
     "options": [
      "Bursa kebab\u0131( \u0130skender Kebap) ",
      "\u0130neg\u00f6l K\u00f6fte",
      "Dik Dik Kebab\u0131 ",
      "Pideli K\u00f6fte"
    ],
    "correct_index": 3
  }
];

// API hazır olduğunda çağrılır
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '500',
        width: '100%',
        videoId: '56GWnfbgAgk',
        playerVars: {
            'playsinline': 1,
            'rel': 0,
            'modestbranding': 1,
            'controls': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// Player hazır olduğunda çağrılır
function onPlayerReady(event) {
    // Video süresini otomatik olarak al
    const duration = player.getDuration();
    console.log("Video süresi: " + duration + " saniye");
    
    // Soru işaretlerini timeline'a yerleştir
    createQuestionMarkers();
    
    // Her 500 ms'de bir video zamanını kontrol et
    checkInterval = setInterval(checkVideoTime, 500);
    
    // SCORM başlat
    initializeSCORM();
    
    // İlerleme bilgilerini güncelle
    updateProgressDisplay();
}

// Player durumu değiştiğinde çağrılır
function onPlayerStateChange(event) {
    playerState = event.data;
    
    // Video bittiğinde
    if (event.data === YT.PlayerState.ENDED) {
        clearInterval(checkInterval);
        showCompletionMessage();
        completeSCORM();
    }
    
    // Video oynatılıyorsa timeline'ı güncelle
    if (event.data === YT.PlayerState.PLAYING) {
        setInterval(updateTimelineProgress, 1000);
    }
}

// Video zamanını kontrol et ve soruları göster
function checkVideoTime() {
    if (playerState === YT.PlayerState.PLAYING) {
        currentTime = Math.floor(player.getCurrentTime());
        
        // Her soru için kontrol et
        questions.forEach(function(question, index) {
            // Videoda ilgili zamana ulaşıldı mı ve soru daha önce gösterilmedi mi?
            if (currentTime === question.time && !questionsShown.includes(question.time)) {
                questionsShown.push(question.time);
                showQuestion(question, index);
                markQuestionAsShown(index);
            }
        });
    }
}

// Timeline ilerleme çubuğunu güncelle
function updateTimelineProgress() {
    if (player && playerState === YT.PlayerState.PLAYING) {
        const duration = player.getDuration();
        const currentTime = player.getCurrentTime();
        const progressPercent = (currentTime / duration) * 100;
        document.querySelector('.timeline-progress').style.width = progressPercent + '%';
    }
}

// Sorguları timeline üzerinde işaretle
function createQuestionMarkers() {
    const timelineMarkers = document.querySelector('.timeline-markers');
    const duration = player.getDuration();
    
    questions.forEach((question, index) => {
        const position = (question.time / duration) * 100;
        const marker = document.createElement('div');
        marker.className = 'question-marker';
        marker.id = 'marker-' + index;
        marker.style.left = position + '%';
        
        const tooltip = document.createElement('div');
        tooltip.className = 'question-tooltip';
        tooltip.textContent = 'Soru ' + (index + 1);
        
        marker.appendChild(tooltip);
        timelineMarkers.appendChild(marker);
        
        // Marker'a tıklandığında video ilgili zamana atlasın
        marker.addEventListener('click', function() {
            player.seekTo(question.time);
        });
    });
}

// Soruyu göster
function showQuestion(question, questionIndex) {
    player.pauseVideo();
    
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const feedback = document.getElementById('feedback');
    
    // Soruyu göster
    questionText.textContent = question.question;
    optionsContainer.innerHTML = '';
    feedback.textContent = '';
    feedback.className = 'feedback';
    
    // Seçenekleri oluştur
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option;
        button.onclick = function() { checkAnswer(index, question.correct_index, questionIndex); };
        optionsContainer.appendChild(button);
    });
    
    // Continue butonunu gizle
    document.getElementById('continue-btn').style.display = 'none';
    
    // Overlay'i göster
    document.getElementById('question-overlay').style.display = 'block';
}

// Cevabı kontrol et
function checkAnswer(selectedIndex, correctIndex, questionIndex) {
    // Tüm butonları devre dışı bırak
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(button => {
        button.classList.add('disabled');
        button.disabled = true;
    });
    
    // Seçilen ve doğru cevabı işaretle
    buttons[selectedIndex].classList.add(selectedIndex === correctIndex ? 'correct' : 'incorrect');
    if (selectedIndex !== correctIndex) {
        buttons[correctIndex].classList.add('correct');
    }
    
    const feedback = document.getElementById('feedback');
    
    if (selectedIndex === correctIndex) {
        feedback.innerHTML = '<span class="correct">✓ Doğru cevap!</span>';
        score++;
    } else {
        feedback.innerHTML = '<span class="incorrect">✗ Yanlış cevap!</span>';
    }
    
    feedback.classList.add('visible');
    
    // Devam butonunu göster
    document.getElementById('continue-btn').style.display = 'inline-block';
    
    // İlerleme bilgilerini güncelle
    updateProgressDisplay();
    
    // Timeline üzerindeki işareti güncelle
    markQuestionAsAnswered(questionIndex);
}

// Soruyu cevaplanmış olarak işaretle
function markQuestionAsAnswered(questionIndex) {
    const marker = document.getElementById('marker-' + questionIndex);
    if (marker) {
        marker.classList.add('answered-marker');
    }
}

// Soruyu gösterilmiş olarak işaretle
function markQuestionAsShown(questionIndex) {
    // Gelecekte ek özellikler için bu fonksiyon kullanılabilir
}

// Devam et butonuna tıklandığında
function continueVideo() {
    document.getElementById('question-overlay').style.display = 'none';
    player.playVideo();
}

// İlerleme bilgilerini güncelle
function updateProgressDisplay() {
    document.getElementById('questions-answered').textContent = questionsShown.length;
    document.getElementById('questions-total').textContent = totalQuestions;
    document.getElementById('correct-answers').textContent = score;
    
    // Yüzde hesapla (en az 1 soru gösterilmişse)
    let percentage = 0;
    if (questionsShown.length > 0) {
        percentage = Math.round((score / questionsShown.length) * 100);
    }
    document.getElementById('success-percent').textContent = percentage;
    
    // İlerleme çubuğunu güncelle
    const progressPercent = (questionsShown.length / totalQuestions) * 100;
    document.querySelector('.progress-fill').style.width = progressPercent + '%';
}

// Tamamlama mesajını göster
function showCompletionMessage() {
    const percentage = Math.round((score / totalQuestions) * 100);
    const completionMessage = document.getElementById('completion-message');
    
    if (percentage >= 70) {
        completionMessage.textContent = 'Tebrikler! Başarıyla tamamladınız. Başarı oranınız: ' + percentage + '%';
    } else {
        completionMessage.textContent = 'Videoyu tamamladınız. Başarı oranınız: ' + percentage + '%';
    }
    
    completionMessage.style.display = 'block';
    
    // Tüm soruları göster
    const timelineMarkers = document.querySelectorAll('.question-marker');
    timelineMarkers.forEach(marker => {
        if (!marker.classList.contains('answered-marker')) {
            marker.style.backgroundColor = '#e74c3c';
        }
    });
}

// Timeline'a tıklandığında video konumunu değiştir
function setupTimelineClicks() {
    const timeline = document.querySelector('.timeline');
    timeline.addEventListener('click', function(e) {
        const timelineWidth = this.offsetWidth;
        const clickPosition = e.offsetX;
        const duration = player.getDuration();
        
        const seekTime = (clickPosition / timelineWidth) * duration;
        player.seekTo(seekTime);
    });
}

// SCORM iletişimi için basit fonksiyonlar
function initializeSCORM() {
    if (window.parent && window.parent.API) {
        window.parent.API.LMSInitialize("");
    }
}

function completeSCORM() {
    if (window.parent && window.parent.API) {
        const scorePercent = (score / totalQuestions) * 100;
        window.parent.API.LMSSetValue("cmi.core.score.raw", scorePercent);
        window.parent.API.LMSSetValue("cmi.core.lesson_status", "completed");
        window.parent.API.LMSCommit("");
        window.parent.API.LMSFinish("");
    }
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    // Timeline tıklama işlevini etkinleştir
    setupTimelineClicks();
    
    // Devam et butonuna tıklama işlevi
    document.getElementById('continue-btn').addEventListener('click', continueVideo);
});
