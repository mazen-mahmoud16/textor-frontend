/*
 * Importing needed libraries
 */
import "./styles.css";
import React, { useCallback, useEffect, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom"; // React DOM Version 5

import { v4 as uuidV4 } from "uuid";

export default function TextEditor() {

  /*
   * Using hooks
   */
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();
  const [no_of_users, setNoOfUsers] = useState();
  const { id: doc_id } = useParams();

  
  useEffect(() => {
    // to resolve cors credentials problem (access-control-allow-origin)
    // Request to server of port 4000
    const socket_io = io("https://text-editor12345.herokuapp.com/", {
      transports: ["websocket", "polling", "flashsocket"],
    });
    setSocket(socket_io);
    return () => {
      socket_io.disconnect();
    };
  }, []);

  useEffect(() => {
    // To make sure that socket and quill are already created before entering this useeffect
    if (socket && quill) {
      //Event listener when receiving changes from server to update quill contents
      socket.on("update_content", (updates) => {
        quill.updateContents(updates);
      });

      /* ################################################################################################################# */

      //Event listener when text changes, to send it to the server to update other clients and database

      quill.on("text-change", (updates, oldupdates, source) => {
        // ***** Only track changes that the user made and discard the APIs changes
        if (source !== "user") return;

        // Send data to the server
        socket.emit("broadcast_updates", updates);
      });

      return () => {
        socket.off("update_content");
        quill.off("text-change");
      };
    }
  }, [socket, quill]);

  useEffect(() => {
    // To make sure that socket and quill are already created before entering this useeffect
    if (socket && quill) {
      // To first request and load the document from the server and fill up the quill with the data came from server/DB
      socket.once("request_document", (document) => {
        quill.setContents(document);
        quill.enable();
      });

      socket.emit("retrieve_document", doc_id);
    }
  }, [socket, quill, doc_id]);

  // Use effect that push data to the database after each quill or socket changes each specified interval of 3000 ms

  useEffect(() => {
    if (socket && quill) {
      const interval = setInterval(() => {
        socket.emit("push-changes-db", quill.getContents());
      }, 3000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [socket, quill]);


  useEffect(() => {
    if (socket && quill) {
      const interval = setInterval(() => {
        socket.emit("users", doc_id);
      socket.on("no_users", (users) => {
        setNoOfUsers(users)
        document.getElementById('user').textContent=users
      });
      }, 3000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [socket,quill,no_of_users,doc_id]);



  // This function is used to prevent reloading the quill when page is refreshed and create the quill element
  const wrapper_handler = useCallback((wrapper) => {
    // Quill is used mainly because it allows us to do small operations one at a time instead of copying
    //and pasting the whole document every time a change is made

    const container = document.createElement("div");

    wrapper.append(container);

    const q = new Quill(container, { theme: "snow" });

    wrapper.innerHtml = "";

    setQuill(q);

    // Disable the quill until getting the right document from the server
    q.disable();
    q.setText("Please wait..");
    setQuill(q);
  }, []);

  // New Document button handle to generate new document in new tab
  const new_doc = () => {
    const win = window.open(`/documents/${uuidV4()}`, "_blank");
    win.focus();
  };

  const load_doc = () => {
    const text = document.getElementById("load_txt");
    if (text.value !== "") {
      const error = document.querySelector('.error')
      error.style.visibility="hidden"
      const win = window.open(`/documents/${text.value}`);
      win.focus();
    } else {
      const error = document.querySelector('.error')
      error.style.visibility="visible"
    }
  };

  return (
    <div>
      <button className="button" onClick={new_doc}>
        New Document
      </button>
      <span id="id_doc">{doc_id}</span>

      <br />
      <br />
      <button className="button" onClick={load_doc}>
        Load Document
      </button>
      <div id="all">
        <input id="load_txt" className="textbox" placeholder="Enter File ID" />
        <span className="error">Please enter a valid file ID</span>
      </div>
      <span className="users">Number of active users on this document: </span>
      <span id="user" className="users">loading...</span>
      <div id="container" ref={wrapper_handler}></div>
    </div>
  );
}
