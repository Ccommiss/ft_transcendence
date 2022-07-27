import React, { useState, useEffect } from 'react';
import { socketo } from '..';
import '../pong.css';

export default function Game() {

   const socket = socketo;
  // socket.on('init', () => { });

  // const [name, setName] = useState("");
  // const [args, setArgs] = useState("");
  // let handleSubmit = (e: any) => {
  //   e.preventDefault();

  //   socket.emit(name, args);

  //   socket.onAny((event, ...args) => {
  //     console.log(event, args);
  //   });

  //   //window.location.reload();
  //   setName("");
  //   setArgs("");

  // }

  let handleStart = () => {
    socket.emit('game_inQueue')
    socket.on('game_countdownStart', (args: any)=> console.log("ca marche chez moi"));
    console.log("ca marche chez moi");
  }

  return (

    <div className='game-container'>
      <button type='button' onClick={handleStart}>Start game</button>
      <div id="start">The game starts in 3 seconds ...</div>
      <canvas id="pong"></canvas>
      <script src="../game.ts"></script>
    </div>


    // <div className='dontknow'>
    //   <form onSubmit={handleSubmit}>
    //     <input
    //       type="text"
    //       value={name}
    //       placeholder="Message"
    //       onChange={(e) => setName(e.target.value)}
    //     />
    //     <input
    //       type="text"
    //       value={args}
    //       placeholder="Args"
    //       onChange={(e) => setArgs(e.target.value)}
    //     />
    //     <button type="submit">Add</button>
    //   </form>
    // </div>
  )
}
