const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');


const CELL_QUAN = 8;
const CELL_SIZE = canvas.height/CELL_QUAN;




const P1 = Player(ctx ,  'red');
const P2 = Player(ctx ,'black');
P1.setNum(0);
P2.setNum(1);

const rrr = P1.createPieces();
const bbb = P2.createPieces();
const ppp = rrr.concat(bbb);

const board = Board(ctx, ppp);
board.draw();


var turnColor = 'red';

canvas.onclick = (e)=>{
  const x = e.clientX - canvas.offsetLeft;
  const y = e.clientY - canvas.offsetTop;
  const pos = position(Math.ceil(x/CELL_SIZE),
                       Math.ceil(y/CELL_SIZE));
  const pieces = board.getPieces();
  let selected = board.getSelected();

  if(selected !== null && selected.getColor() === turnColor){
    board.getSelectedMoves().every(move=>{
      if(move[0].toString === pos.toString){
        board.movePiece(selected, move[0]);
        
        selected.setCombo(true);
        if(pieces.length !== board.getPieces().length &&
           board.canPieceFrag(selected)){
          selected.setCombo(true);
        } else {
          turnColor = turnColor === 'red' ? 'black' : 'red';
          board.setTurnColor(turnColor);
          selected.setCombo(false);
          board.setSelected(null);
          board.draw();

        }
        return false;
      }
      return true;
    });
  }
  const selectable = board.getSelectablePieces(turnColor);
  selectable.every((p)=>{
    let clicked = p.getPos().toString === pos.toString;
    if(clicked){
      if (p.getColor() === turnColor)
        board.setSelected(p);
      board.draw();
      return false;
    }
    return true;
  });
}

function Player(ctx, color = "red"){
  
  const _color = color;
  var _num;

  function createPieces(){
    const startRow = _num === 0 ?  8 : 1;
    const increment = _num === 0 ? -1 : 1;
    
    let pieces = [];
    for(let row = 0; row < 3; row++){
      for(let column = 0; column < 4; column++){
        let y = startRow + (row*increment);
        let x = column*2 + (y % 2) + 1;
        pieces.push(Piece(ctx, position(x,y), _color));
      }
    }
    return pieces;
  }
  
  function setNum(num){
    if(num !== 0 && num !== 1)
      throw "Недопустимый номер игрока: " + num;
    
    _num = num;
  }
  
  const publicMethods = {
    createPieces: createPieces,
    color: _color,
    setNum: setNum
  }
  return publicMethods;
}



function Board(ctx, pieces){
  var _pieces = pieces;
  var _ctx = ctx;
  var _selected = null;
  var _selectedAllowedMoves = null;
  
  var _turnColor = 'red';
  const _boardSize = CELL_SIZE * CELL_QUAN;
  const _moveColor = 'green';
  
  
  
  
  function destroyPiece(piece){
    _pieces = _pieces.filter(p => p !== piece);
  }
  
  function getPieceAtPos(pos){
    return _pieces.find(p=> p.getPos().toString ===
                            pos.toString);
  }

  function movePiece(piece, pos){
    if(!pos)
      throw "Ход за пределы доски";
    
    if(_pieces.indexOf(piece) === -1)
      throw "Такой пешки нет на доске: " + piece;
    
    if(piece.getPos().toString === pos.toString){
      //  Когда дамка рубит пешку, то movePiece почему-то вызывается два раза:
      // первый раз с правильными аргументами, второй раз со своей позицией.
      // Понятия не имею, почему так происходит. Пока сделаю эту проверку, чтобы
      // отменять второй вызов функции. 
      return;
    }
       
    
    const allowed = getAllowedMoves(piece);
    const moveWithCallback = createMove(allowed, pos);
    if(!moveWithCallback)
      throw "Эта пешка не может сделать такой ход (BOARD)";
    

    piece.setPos(moveWithCallback[0]);
    moveWithCallback[1]();
    if(pos.cellY === CELL_QUAN || pos.cellY === 1){
      piece.setQueen();
    }
  }
  function setSelected(piece){
    _selected = piece;
    if(_selected === null)
      _selectedAllowedMoves = null;
    else
      _selectedAllowedMoves = getAllowedMoves(piece);
  }
  
  function createMove(list, pos){
    let move = null;
    list.every(m=>{
      if(m[0].cellX === pos.cellX &&
         m[0].cellY === pos.cellY)
      {
        move = m;
        return false;
      }
      return true;
    });
    return move;
  }
  
  function getAllowedMoves(piece){
    const pos = piece.getPos();
    const allowed = [];
    const forced =  [];
    var callback = ()=>{};
    

    let suggested = piece.getPossibleMoves();
    
    // Отображает, может ли дамка продолжать движение в каком-то направлении
    let dirStat = {};
    // Действия для этого направления
    let dirCB = {};
    suggested.forEach(move=>{
      if(!move) return; //Ход вне доски
      
      const offsetX = piece.getPos().cellX > move.cellX ? -1 : 1;
      const offsetY = piece.getPos().cellY > move.cellY ? -1 : 1;
      
      if(dirStat[offsetX+"|"+offsetY] === 'blocked') return; // Путь заблокирован
      
      const pieceAtMove = getPieceAtPos(move);
      if(!pieceAtMove && !piece.isCombo){
        //Клетка пустая
        if(dirStat[offsetX+"|"+offsetY] === 'forced'){
          let cb = dirCB[offsetX+"|"+offsetY];
          forced.push([move, cb, 'f']);
          return;
        }
        
        allowed.push([move, callback, 'n']);
        return;
      }

      if(dirStat[offsetX+"|"+offsetY] === 'forced'){
        //  Если для прохождения по пути надо съесть пешку противника,
        // и свободных полей дальше нет,
        // то этот путь становится закрытым. П1.П2.[ ].[ ].П2.[X]
        dirStat[offsetX+"|"+offsetY] = 'blocked';
        return;
      }
      
      if(pieceAtMove.getColor() === piece.getColor()){
        //На клетке союзник
        dirStat[offsetX+"|"+offsetY] = 'blocked';
        return;
      }
      
      const behindY = move.cellY + offsetY;
      const behindX = move.cellX + offsetX;
      
      const behindPos = position(behindX, behindY);
      if(!behindPos) {
        // Пешка противника стоит на краю
        return;
      }
      
    
      const pieceBehind = getPieceAtPos(behindPos);

      if(!pieceBehind){
        // Если за пешкой противника нет никого, то мы должны её съесть.
        const oldCb = callback;
        const newCb = ()=>{
          oldCb();
          destroyPiece(pieceAtMove);
        };
        forced.push([behindPos, newCb, 'f']); // 'f' == это обязательный ход
        dirStat[offsetX+"|"+offsetY] = 'forced';
        dirCB[offsetX+"|"+offsetY] = newCb;
      } else {
        dirStat[offsetX+"|"+offsetY] = 'blocked';
      }
    });
    return forced.length === 0 ? allowed : forced;
  }
  
  function canPieceFrag(piece){
    const moves = getAllowedMoves(piece);
    let result = false;
    moves.every(move=>{
      if(move[2] === 'f'){
        result = true;
        return false;
      }
      return true;
    });
    return result;
  }
  
  function getSelectablePieces(color){
    const forced = [];
    const allowed = [];
    const combo = [];
    _pieces.every(piece=>{
      if(piece.getColor() !== color) return true;
      if(piece.isCombo && _selected === piece){
        combo.push(piece);
        return false;
      }
      
      let moves = getAllowedMoves(piece);
      if(moves.length === 0) return true;
      
      if(canPieceFrag(piece)) forced.push(piece);
      else allowed.push(piece);
      
      return true;
    });
    if(combo.length > 0) return combo; 
    return forced.length > 0 ? forced : allowed;
  }
  
  function drawMoves(moves){
    moves.forEach(move=>{
      Piece(_ctx, move[0], _moveColor).draw('outline');
    });
  }
  
  function drawNet(){
    for(let h = 0; h < CELL_QUAN-1; h++){
      let pos = CELL_SIZE + CELL_SIZE*h;
      //make lines crisp
      pos = Math.floor(pos)+0.5;
      
      _ctx.beginPath();
      _ctx.moveTo(pos, 0); // | vertical line
      _ctx.lineTo(pos, _boardSize);
      
      _ctx.moveTo(0, pos); // — horizontal line
      _ctx.lineTo(_boardSize, pos);
      _ctx.stroke();
    }
  }
  function drawSquares(){
    for(let x = 0; x < CELL_QUAN; x++){
      for(let y = 0; y < CELL_QUAN; y++){
        let posX = CELL_SIZE + CELL_SIZE*x;
        let posY = CELL_SIZE + CELL_SIZE*y;
      }
    }
  }
  function drawPieces(){
    _pieces.forEach(piece=>{
      piece.draw();
    });
    
    getSelectablePieces(_turnColor).forEach(piece=>{
      Piece(_ctx, piece.getPos(), _moveColor).draw('outline');
    });
  }
  
  function draw(){
    _ctx.clearRect(0,0,_boardSize,_boardSize);
    drawNet();
    drawPieces();
    
    if(_selected !== null){
      drawMoves(_selectedAllowedMoves);
    }
    
  }
  
  const publicMethods = {
    draw: draw,
    movePiece: movePiece,
    getPieces: ()=>_pieces,
    
    getSelected: ()=>_selected,
    setSelected: setSelected,
    getSelectedMoves: ()=>_selectedAllowedMoves,
    
    canPieceFrag: canPieceFrag,
    getSelectablePieces: getSelectablePieces,
    
    setTurnColor: (color)=> _turnColor = color,
    turnColor: _turnColor
  }
  
  return publicMethods;
}


function Piece(ctx, pos, color = 'red'){
  var _color = color;
  var _ctx = ctx;
  var _pos = pos;
  var _isQueen = false;
  var _combo = false;
  
  const _radius = CELL_SIZE/2 - 2.5;
  const _crownColor = "#FC0";
  
  function getPossibleMoves(){
    let possibleMoves = [];
    if(_isQueen){
      for(let x = 1; x < 8; x++){
        possibleMoves.push(
          position(_pos.cellX - x, _pos.cellY - x), //7
          position(_pos.cellX - x, _pos.cellY + x), //1
          position(_pos.cellX + x, _pos.cellY - x), //9
          position(_pos.cellX + x, _pos.cellY + x)  //3
        );
      }
    } else {
      const dir = _color === 'red' ? -1 : 1;
      possibleMoves.push(
        position(_pos.cellX-1, _pos.cellY + dir),
        position(_pos.cellX+1, _pos.cellY + dir));
      
      if(_combo){
         possibleMoves.push(
           position(_pos.cellX-1, _pos.cellY - dir),
           position(_pos.cellX+1, _pos.cellY - dir));
      }
    }
    
    return possibleMoves;
  }
  
  function draw(mode = 'filled'){
    drawPiece(mode);
    
    if(_isQueen){
      drawCrown();
    }
  }
  function drawCrown(){
      _ctx.beginPath();
      
      let x = _pos.x;
      let y = _pos.y + _radius/2.5;
      _ctx.moveTo(x, y);
      
      _ctx.lineTo(x - _radius/2  , y);
      _ctx.lineTo(x - _radius/1.5, y - _radius/1.5);
      _ctx.lineTo(x - _radius/3  , y - _radius/3);
      
      _ctx.lineTo(x, y - _radius);
      
      _ctx.lineTo(x + _radius/3  , y - _radius/3);
      _ctx.lineTo(x + _radius/1.5, y - _radius/1.5);
      _ctx.lineTo(x + _radius/2  , y);
      
      _ctx.fillStyle = _crownColor;
      _ctx.fill();
  }
  function drawPiece(mode = 'filled'){
    _ctx.beginPath();
    _ctx.arc(_pos.x, _pos.y, _radius, 0, deg(360));

    if(mode === 'filled'){
      _ctx.fillStyle = _color;
      _ctx.fill();
    } else {
      let oldStyle = _ctx.strokeStyle;
      let oldWidth = _ctx.lineWidth;
      _ctx.lineWidth = 4;
      _ctx.strokeStyle = _color;
      _ctx.stroke();
      _ctx.strokeStyle = oldStyle;
      _ctx.lineWidth = oldWidth;
    }
  }
  
  var publicMethods = {
    getColor: ()=>_color,
    setColor: (c)=>_color = c,
    
    getPos: ()=>_pos,
    setPos: (p)=>_pos = p,
    
    isQueen: ()=>_isQueen,
    setQueen: ()=>_isQueen = true,
    
    isCombo: _combo,
    setCombo: (boo)=>_combo = boo,
    
    getPossibleMoves: getPossibleMoves,
    
    draw: draw
  }
  return publicMethods;
}

function position(x,y){
  if((x < 1 || x > CELL_QUAN) || (y < 1 || y > CELL_QUAN)) 
    return null;
  
  let rad = CELL_SIZE/2;
  let xReal = rad+(rad*2)*(x-1);
  let yReal = rad+(rad*2)*(y-1);
  

  return {
    cellX: x,
    cellY: y,
    x: xReal,
    y: yReal,
    toString: x+','+y
  }
}

function deg(degrees){
  return (Math.PI/180)*degrees;
}
