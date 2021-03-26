function bubbleSort(arr){
  let tick = 1;
  var canvas = document.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  
  drawArray(ctx, arr);
 
  for(var x = 0; x < arr.length; x++){
    for(var y = 0; y < arr.length-1; y++){
      if(arr[y] > arr[y+1]){
        let t = arr[y];
        arr[y] = arr[y+1];
        arr[y+1] = t;
        
        let cop = [...arr];
        let selected = y+1;
        setTimeout(()=>{
          ctx.clearRect(0, 0, 150, 150)
          drawArray(ctx, cop, selected);
        }, ++tick*50);
      }
      
    }
  }
  
  return arr;
}

function drawVLine(ctx, x, y){
  ctx.beginPath();
  ctx.moveTo(x, 150);
  ctx.lineTo(x, 150-y);
  ctx.stroke();
  ctx.closePath();
}


function createRandomArray(elems = 10){
  let arr = [];
  for(let y = 0; y < elems; y++){
    arr[y] = Math.floor(Math.random() * 100) + 1;
  }
  return arr;
}

function drawArray(ctx, arr, selected){
  for(let x = 0; x < arr.length; x++){
    if(x === selected)
      ctx.strokeStyle = 'rgb(200, 0, 0)';
    drawVLine(ctx, x*5+2, arr[x]);
      ctx.strokeStyle = 'rgb(0, 0, 0)'
  }
}

function draw(){
	let arr = createRandomArray(30);
	console.log(arr);
	arr = bubbleSort(arr);
	console.log(arr);
}


