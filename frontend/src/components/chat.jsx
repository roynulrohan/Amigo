import React, { useState, useEffect } from 'react';
import Message from './message';
import '../sass/components/_chat.scss';
import { CSSTransition } from 'react-transition-group';
import { useSocket } from '../contexts/SocketProvider';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useHistory } from 'react-router-dom';
import axios from 'axios';
import { setMessage } from '../actions';

const Chat = () => {
    const user = useSelector((state) => state.userReducer);
    const messageReducer = useSelector((state) => state.messageReducer);
    const onlineUsersReducer = useSelector((state) => state.clientsReducer);
    const dispatch = useDispatch();
    const location = useLocation();
    const [recipient, setRecipient] = useState('');
    const [recipientStatus, setRecipientStatus] = useState(false);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [sendButtonDisabled, setSendButtonDisabled] = useState(false);
    const [conversationCount, setConversationCount] = useState(0);
    const socket = useSocket();
    const dateFormat = require('dateformat');

    useEffect(() => {
        if (recipient) {
            document.title = 'Amigo | ' + recipient;
        } else {
            document.title = 'Amigo | Home';
        }

        if (user.currentUser && recipient) {
            axios({
                method: 'post',
                url: '/message/',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    Users: [user.currentUser.Username, recipient],
                }),
            }).then((res) => {
                if (res.data.success) {
                    setMessages(res.data.result.Messages);
                }
            });
        }

        if (user.currentUser && !recipient) {
            axios({
                method: 'post',
                url: '/message/',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    Users: [user.currentUser.Username],
                }),
            }).then((res) => {
                if (res.data.success) {
                    setConversationCount(res.data.result.length);
                }
            });
        }

        return () => {
            setMessages([]);
        };
    }, [user, recipient]);

    useEffect(() => {
        if (location) {
            setRecipient(location.recipient);
        }
    }, [location]);

    useEffect(() => {
        if (onlineUsersReducer.currentClients) {
            setRecipientStatus(onlineUsersReducer.currentClients.includes(recipient));
        }

        return () => {
            setRecipientStatus(false);
        };
    }, [onlineUsersReducer, recipient]);

    useEffect(() => {
        if (messageReducer.currentMessage && !messageReducer.currentMessage.isMe) {
            setMessages((messages) => [
                {
                    Username: messageReducer.currentMessage.sender,
                    Content: messageReducer.currentMessage.content,
                    DateCreated: messageReducer.currentMessage.date,
                },
                ...messages,
            ]);
        }

        return () => socket && socket.off('recieve-message');
    }, [messageReducer]);

    const messageSend = (e) => {
        e.preventDefault();

        if (chatInput) {
            setMessages((messages) => [
                {
                    Username: user.currentUser.Username,
                    Content: chatInput,
                    DateCreated: new Date(),
                },
                ...messages,
            ]);

            socket.emit('send-message', {
                recipient: recipient,
                message: chatInput,
                date: Date.now(),
            });

            dispatch(
                setMessage({
                    sender: recipient,
                    content: chatInput,
                    date: Date.now(),
                    isMe: true,
                })
            );

            setSendButtonDisabled(true);
            axios({
                method: 'post',
                url: '/message/update',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    Users: [user.currentUser.Username, recipient],
                    message: {
                        Username: user.currentUser.Username,
                        Content: chatInput,
                        DateCreated: Date.now(),
                    },
                }),
            }).then((res) => {
                setTimeout(() => {
                    setSendButtonDisabled(false);
                }, 500);
            });

            setChatInput('');
        }
    };

    const daysBetween = function (startDate, endDate) {
        return Math.round(Math.abs((startDate.getTime() - endDate.getTime()) / (24 * 60 * 60 * 1000)));
    };

    return (
        <CSSTransition in={true} appear={true} timeout={600} classNames='fade' unmountOnExit key={recipient}>
            {recipient && user.currentUser ? (
                <div className='chat h-100'>
                    <div className='header d-flex justify-content-center align-items-center w-100 p-3'>
                        <h2 className='m-0'>
                            <span className='d-flex justify-content-center align-items-center badge rounded-pill bg-dark-accent'>
                                <span>{recipient}</span>
                                <span style={{ width: '2em' }}></span>
                                <span className={'badge rounded-pill ' + (recipientStatus ? 'bg-success' : 'bg-danger')}>
                                    {recipientStatus ? 'Online' : 'Offline'}
                                </span>
                            </span>
                        </h2>
                    </div>
                    <div className='conversation d-flex flex-column-reverse px-4 py-2'>
                        {messages &&
                            messages.map((message, index) => {
                                let hideTitle = false;
                                let newDay = true;

                                if (messages[index + 1]) {
                                    if (message.Username === messages[index + 1].Username) {
                                        hideTitle = true;
                                    }

                                    newDay = daysBetween(new Date(message.DateCreated), new Date(messages[index + 1].DateCreated)) > 0;
                                }

                                return (
                                    <div>
                                        {newDay && (
                                            <div class='separator'>
                                                {new Date(message.DateCreated).getDate() === new Date().getDate()
                                                    ? 'Today'
                                                    : dateFormat(message.DateCreated, 'fullDate')}
                                            </div>
                                        )}
                                        <Message
                                            key={message.Username + message.Content + message.DateCreated}
                                            name={message.Username}
                                            content={message.Content}
                                            date={message.DateCreated}
                                            isMe={user.currentUser.Username === message.Username}
                                            hideTitle={hideTitle}
                                        />
                                    </div>
                                );
                            })}
                    </div>
                    <div className='input d-flex justify-content-center align-items-center w-100 p-3'>
                        <form
                            className='input-group d-flex justify-content-center align-items-center rounded-pill bg-dark-accent w-100 h-100 px-4 mx-4'
                            onSubmit={messageSend}>
                            <input
                                type='text'
                                class='form-control'
                                placeholder='Enter your message'
                                aria-label='Message'
                                value={chatInput}
                                onChange={(ev) => {
                                    setChatInput(ev.target.value);
                                }}
                            />
                            <div class='input-group-append mx-2'>
                                <button type='submit' class='btn btn-info' disabled={sendButtonDisabled}>
                                    Send
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className={'chat d-flex flex-column justify-content-center align-items-center ' + (user.currentUser ? '' : 'm-0')}>
                    <div className='text-center app-font prewrap'>
                        <h2>
                            Hello,
                            <span className='app-title ms-3'>{user.currentUser.Username}</span>
                        </h2>
                        <h5 className='text-muted mt-3'>
                            {conversationCount !== 0 ? (
                                <span>
                                    {'You have ' +
                                        conversationCount +
                                        (conversationCount > 1
                                            ? ' active conversations.\nClick on one to chat!'
                                            : ' active conversation.\nClick on their card to chat!')}
                                </span>
                            ) : user.currentUser.Contacts.length !== 0 ? (
                                <span>
                                    {'You have ' +
                                        user.currentUser.Contacts.length +
                                        (user.currentUser.Contacts.length > 1
                                            ? ' contacts.\nClick on one to chat!'
                                            : ' contact.\nClick on their card to chat!')}
                                </span>
                            ) : (
                                <span>{'You have no contacts yet.\nHead over to the contacts tab to create one!'}</span>
                            )}
                        </h5>
                    </div>
                </div>
            )}
        </CSSTransition>
    );
};

export default Chat;
