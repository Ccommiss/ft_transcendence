import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import {socketo} from '../index';

export default function Home() {

    const [socket, setSocket] = useState<any>([]);
    const [users, setUsers] = useState<any>([]);
    const [friends, setFriends] = useState<any>([]);

    useEffect(() => {
        const socket = socketo;
        setSocket(socket);
        socket.emit('getUsers');
        socket.emit('getFriends');
        socket.on('listUsers', (tab:any) => {
            setUsers(tab);
          });
        socket.on('friendList', (msg:any, tab:any) => {
            setFriends(tab);
        });
      }, []);

    const [next, setNext] = useState(0);
    const [singleColor, setSingleColor] = useState("white");
    const [doubleColor, setDoubleColor] = useState("white");
    const [mode, setMode] = useState(0);
    const [error, setError] = useState("");

    function handleSingleMode() {
        setMode(1);
        setSingleColor("#1dd1a1");
        setDoubleColor("white");
    }

    function handleDoubleMode() {
        setMode(2);
        setSingleColor("white");
        setDoubleColor("#1dd1a1");
    }

    function handleLook() {
        if (!mode)
            setError("YOU MUST SELECT A MODE");
        else
            setNext(2);
    }

    function displayFriends() {
        var indents:any = [];
        let j = 0;
        let i = 0;
        while (j < users?.length)
        {
            i = 0;
            while (i < friends?.friends?.length)
            {
                if (friends?.friends[i].id === users[j].id)
                    if (users[j].status === 'online')
                    {
                        indents.push(
                            <div className='home-search-single-friend' key={i}>
                                <img src={friends?.friends[i].avatar_url}></img>
                                <h5>{friends?.friends[i].name}</h5>
                                <button>PLAY</button>
                            </div>
                        );
                    }
                i++;
            }
            j++;
        }
        return indents;
    }

    function displaySteps() {
        if (!next)
        {
            return (
                <div className='home-button'>
                    <h2>WELCOME TO <span>BABY-PONG</span> !</h2>
                    <button onClick={() => setNext(1)}>START TO PLAY</button>
                </div>
            );
        }
        else if (next === 1)
        {
            return (
                <div className='home-mode'>
                    <h2>SELECT YOUR GAME MODE</h2>
                    <div className='home-mode-button'><button onClick={handleSingleMode} style={{backgroundColor : singleColor}}>SINGLE PALLET</button></div>
                    <div className='home-mode-button'><button onClick={handleDoubleMode} style={{backgroundColor : doubleColor}}>DOUBLE PALLETS</button></div>
                    <div className='home-look-button'><button onClick={handleLook}><FontAwesomeIcon icon={faMagnifyingGlass} className="glass"/>LOOK FOR A GAME</button></div>
                    {error && <h5>{error}</h5>}
                </div>
            );
        }
        else if (next === 2)
        {
            let mode_selec = "";
            if (mode === 1)
                mode_selec = "SINGLE PALLET";
            else if (mode === 2)
                mode_selec = "DOUBLE PALLETS";

            return (
                <div className='home-search'>
                    <h2>FIND A GAME</h2>
                    <h3>MODE : <span>{mode_selec}</span></h3>
                    <div className='home-play-matchmaking'><button>PLAY WITH MATCHMAKING</button></div>
                    <div className='home-play-friends'>
                        <h4>PLAY WITH ONLINE FRIENDS</h4>
                        {displayFriends()}
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="home-container">
            {displaySteps()}
        </div>
    );
}