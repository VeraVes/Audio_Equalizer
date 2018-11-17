
var mainVar = {
  bs: null, //текущий буфер
  sp: null, //текущий процессор
  ac: null, //текущий аудиоконтекст
  x: 0.5 //текущая координата канвас
}

if(window.File && window.FileReader && window.FileList && window.Blob) {
  window.onload = function () {
    document.querySelector('input').addEventListener('change', processFiles, false);
    var dropBox = document.getElementById("dropBox");
    dropBox.ondragenter = enterDrag;
    dropBox.ondragover = ignoreDrag;
    dropBox.ondragleave = leaveDrag;
    dropBox.ondrop = drop;
  }
} 
else {
  alert('К сожалению ваш браузер не поддерживает file API');
}


//При заходе на область дропа
function enterDrag(e) {
  e.stopPropagation();
  e.preventDefault();
  var dropbx = document.getElementById('dropBox');
  dropbx.style.backgroundColor = "#c1efff";
}

//При выходе с области дропа
function leaveDrag(e) {
  e.stopPropagation();
  e.preventDefault();
  var dropbx = document.getElementById('dropBox');
  dropbx.style.backgroundColor = "#ffffff";
}

//При нахождении на области дропа
function ignoreDrag(e) {
  e.stopPropagation();
  e.preventDefault();
}


//При дропе
function drop(e) {
  e.stopPropagation();
  e.preventDefault();
  var dropbx = document.getElementById('dropBox');
  dropbx.style.backgroundColor = "#ffffff";
  var datas = e.dataTransfer;
  var files = datas.files;
  processFiles(files);
}

//Проверить, какого типа файл поступил, отправить файл на обработку
function processFiles(files) {
  makeWaiting(); 
  for (i=0;i<files.length;i++) {
    var file = files[i];
    var data;
    if(/audio.*/.test(file.type)) {
      readFile(file);
    }
    else {
      data = [Date(), file.name, 'Файл не является аудиозаписью'];
      appendFileInfo(data);
    } 
  }
  makeNotWaiting();
}


//Отобразить иконку ожидания, скрыть текст дропа
function makeWaiting(){
  var image = document.getElementById('imag');
  image.style.display = 'block';
  var dropbx = document.getElementById('dropBox');
  dropbx.innerHTML = '';
}


//Скрыть иконку ожидания, отобразить текст дропа
function makeNotWaiting(){
  var image = document.getElementById('imag');
  image.style.display = 'none';
  var dropbx = document.getElementById('dropBox');
  dropbx.innerHTML = 'Перетащите аудио сюда...';
}

//Прочитать файл, отправить информацию о нем на добавления в таблицу
function readFile(file) {
  var fr = new FileReader();
  fr.readAsArrayBuffer(file); 
  fr.onload = function(event) {
    disconnectProcessor();
    createAudioData(event.target.result);
    data = [Date(), file.name, 'Аудиозапись'];
    appendFileInfo(data);
    appendFileName(file.name);
  }
}

//Создать таблицу с заголовком
function createTable() {
  var output = document.getElementById('output');
  var table = document.createElement('table');
  var tbody = document.createElement('tbody');
  tbody.id = "tablebody";
  output.innerHTML = '';
  table.appendChild(tbody);
  tbody.innerHTML = "<tr><td>Loaded</td><td>Name</td><td>Comment</td></tr>";
  output.appendChild(table);
}

//Добавить информацию о файле в таблицу
function appendFileInfo(data) {
  if(document.getElementById('tablebody')===null){
    createTable();
  }
  var tbody = document.getElementById('tablebody');
  var tr = document.createElement('tr');
  for(var j = 0; j < data.length; j++) {
      td = document.createElement('td');
      td.innerHTML = data[j] || 'неизвестно';
      tr.appendChild(td);
    }
  tbody.appendChild(tr);
}

//Добавить в подпись название файла
function appendFileName(name) {
  var textRow = document.querySelector(".right-bottom-block__compos-name");
  textRow.innerHTML = name;
}

//Получить, декодировать аудиоданные
function createAudioData(result) {
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  var audioCtx = new AudioContext();
  var audioData = result;
  audioCtx.decodeAudioData(
    audioData,
    function (buffer) {
      createBuffer(buffer, audioCtx);
    },
    function (e) {
      alert( "Error with decoding audio data" + e.err );
    }
  );
};


//Создать аудиобуффер, скриптпроцессор, подсоединить, подготовить к воспроизведению
function createBuffer(buffer, audioCtx) {
  var bufferSource = audioCtx.createBufferSource();
  bufferSource.buffer = buffer;
  var scriptProcessor = audioCtx.createScriptProcessor ? audioCtx.createScriptProcessor(2048, 1, 1) : audioCtx.createJavaScriptNode(2048, 1, 1 );
  scriptProcessor.onaudioprocess = audioOn;
  preparePlay(bufferSource, scriptProcessor, audioCtx);
  bufferSource.connect(scriptProcessor);
  scriptProcessor.connect(audioCtx.destination);
  bufferSource.start(0);
}


//Снимать входящие сигналы и отправлять на визуализацию
function audioOn (ape) {
  var inputBuffer = ape.inputBuffer;
  var inputData = inputBuffer.getChannelData(0);
  var outputBuffer = ape.outputBuffer;
  var outputData = outputBuffer.getChannelData(0);
  outputData.set(inputData);
  mainVar.x = vizualize(countAverage(inputData), mainVar.x);
};

//Посчитать среднее значение импульсов для отображения
function countAverage(array) {
  var sum = 0;
  for (j = 0; j < array.length; j++) {
    sum += array[j];
  }
  return (sum / array.length);
}


//Подготовить к воспроизведению кнопки, отключить предыдущие процессор и буфер 
function preparePlay(bufferSource, scriptProcessor, audioCtx){
  disconnectProcessor();
  makeCtrlPlay(bufferSource, scriptProcessor, audioCtx);
  makeCtrlPause(bufferSource, scriptProcessor, audioCtx);
  setBuffer(bufferSource, scriptProcessor, audioCtx);
  prepareCanvas();
}

//Отключить предыдущие процессор и буфер, сбросить значения 
function disconnectProcessor(){
  if (mainVar.bs!=null) {
    mainVar.bs.disconnect(mainVar.sp);
    mainVar.sp.disconnect(mainVar.ac.destination);
    mainVar.sp = null;
    mainVar.bs = null;
    mainVar.ac = null;
  }
}

//Запонить значения нынешних буфера, процессора и контекста
function setBuffer(bufferSource, scriptProcessor, audioCtx){
  mainVar.bs = bufferSource;
  mainVar.sp = scriptProcessor;
  mainVar.ac = audioCtx;
};


//Создать канвас
function createCanvas() {
  var canvasBlock = document.getElementById('rmb');
  var canvas = document.createElement('canvas');
  canvas.id = "songcanvas";
  canvasBlock.appendChild(canvas);
  canvas.width = 1000;
  canvas.height = 200;
}


//Подготовить канвас к визуализации
function prepareCanvas() {
  if (document.getElementById('songcanvas')===null) {
    createCanvas();
  }
  mainVar.x = 0.5;
  var canvas = document.getElementById('songcanvas');
  canvas.ctx = canvas.getContext( "2d" );
  canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.ctx.fillStyle = "#c1c1c1";
  var canvasHh = Math.floor(canvas.height/2);
  canvas.ctx.fillRect(0, canvasHh-0.5, canvas.width, 1);
}


//Подключить буфер и процессор, назначить стили кнопкам
function makeCtrlPlay (bufferSource, scriptProcessor, audioCtx){
  var pl = document.getElementById("play");
  var stop = document.getElementById("pause");
  pl.style.backgroundImage = 'url("Play_br.png")';
  pl.onclick = function() {
    bufferSource.connect(scriptProcessor);
    scriptProcessor.connect(audioCtx.destination);
    setBuffer(bufferSource, scriptProcessor, audioCtx);
    pl.setAttribute('disabled', 'disabled');
    pl.style.backgroundImage = 'url("Play_br.png")';
    stop.style.backgroundImage = 'url("Pause.png")';
  }
}

//Отключить буфер и процессор, назначить стили кнопкам
function makeCtrlPause (bufferSource, scriptProcessor, audioCtx){
  var stop = document.getElementById("pause");
  var pl = document.getElementById("play");
  stop.style.backgroundImage = 'url("Pause.png")';
  stop.onclick = function() {
    disconnectProcessor();
    pl.style.backgroundImage = 'url("Play.png")';
    pl.removeAttribute('disabled');
    stop.style.backgroundImage = 'url("Pause_br.png")';
  }
}


//Отобразить импульс на канвас
function vizualize(sample, curX) {
  var canvas = document.getElementById('songcanvas');
  var canvasHh = Math.floor(canvas.height/2);
  curX++;
  sample=sample*2000;
  canvas.ctx.beginPath();
  canvas.ctx.moveTo(curX, canvasHh-sample);
  canvas.ctx.lineTo(curX, canvasHh+sample);
  canvas.ctx.stroke();
  return curX;
}