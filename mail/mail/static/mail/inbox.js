document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // Send email
  document.querySelector('#compose-form').addEventListener('submit', send_email);
  
  // By default, load the inbox
  load_mailbox('inbox');

});

function compose_email(event, sender, subject, body, timestamp) {
  if (event) {
    event.preventDefault();
  }
  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-body').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  if (sender === undefined && subject === undefined) {
    document.querySelector('#compose-recipients').value = '';
    document.querySelector('#compose-subject').value = '';
    document.querySelector('#compose-body').value = '';
  } else {
    body = body.replace(/<br>/g, '\n'); // If user use linebreak (presing the enter) in email, preserve the line breaks
    document.querySelector('#compose-recipients').value = sender;
    document.querySelector('#compose-subject').value = 'Re: ' + subject;
    document.querySelector('#compose-body').style.whiteSpace = 'pre-line';
    document.querySelector('#compose-body').value = 'On ' + timestamp + ' ' + sender + ' wrote:\n' + body + '\n\n' ;
  }
}


function send_email(event) {
  event.preventDefault();
  // Get the email data
  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;

  // Send the email
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: recipients,
      subject: subject,
      body: body
    })
  })
  .then(response => response.json())
  .then(result => {
    // Print result
    console.log(result);
    // Load the sent mailbox
    load_mailbox('sent');
  });
}

function archive_email(email_id) {
  fetch(`/emails/${email_id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: true
    })
  })
  .then(response => {
    if (response.ok) {
      load_mailbox('archive');
    } else {
      console.log('Failed to archive email.');
    }
  });
}

function unarchive_email(email_id) {
  fetch(`/emails/${email_id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: false
    })
  })
  .then (response => {
    if (response.ok) {
      load_mailbox('inbox');
    } else {
      HTMLFormControlsCollection.log('Failed to unarchieve email.');
    }
  });
}

function delete_email(email_id) {
  fetch(`/emails/${email_id}`, {
    method: 'DELETE'
  })
  // If the email is deleted, load the updated inbox
  .then(response => {
    if (response.ok) {
      load_mailbox('inbox');
    } else {
      console.log('Failed to delete email');
    }
  })
  .catch(error => {
    console.log('Error deleting email:', error);
  });
}


function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';

  // Hide the email body
  const emailBodyDivs = document.querySelectorAll('#email-body div');
  emailBodyDivs.forEach(div => {
    div.style.display = 'none';
  });

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Fetch the emails
  fetch(`/emails/${mailbox}`)
  .then(response => response.json()) // Convert the response to JSON
  .then(emails => {
    // Print emails
    console.log(emails);

    // Create table element
    const table = document.createElement('table');
    table.className = 'table table-striped';

    // Create table headers
    let headers;
    if (mailbox === 'sent') {
      headers = ['To', 'Subject', 'Time'];
    } else {
      headers = ['From', 'Subject', 'Time'];
    }
    const headerRow = table.insertRow();
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });

    // Create table rows with email data
    emails.forEach(email => {
      const row = table.insertRow();
      const senderCell = row.insertCell(0);
      const subjectCell = row.insertCell(1);
      const timeCell = row.insertCell(2);

      if (mailbox === 'sent') {
        senderCell.textContent = email.recipients;
      } else {
        senderCell.textContent = email.sender;
      }
      subjectCell.textContent = email.subject;
      timeCell.textContent = email.timestamp;

      // Change font according to email as read or unread
      if (email.read) {
        row.style.fontWeight = 'normal';
      }
      else {
        row.style.fontWeight = 'bold';
      }

      // Create a div for the email body
      const email_body = document.createElement('div');
      email_body.style.display = 'none';
      email_body.innerHTML = `
        <div style="border: 2px solid grey; border-radius: 10px">
            <label style='font-weight: bold'> From: </label> <label> ${email.sender}</label>
            <br>
            <label style='font-weight: bold'> To: </label> <label> ${email.recipients}</label>
            <br>
            <label style='font-weight: bold'> Subject: </label> <label> ${email.subject}</label>
            <br>
            <label style='font-weight: bold'> Time: </label> <label> ${email.timestamp}</label>
            <br>
            ${mailbox !== 'sent' ? `<button class="btn btn-sm btn-outline-primary" onclick="compose_email(event, '${email.sender}', '${email.subject}', '${email.body.replace(/\n/g, '<br>')}', '${email.timestamp}')">Reply</button>` : ''}
            ${mailbox === 'inbox' ? `<button class="btn btn-sm btn-outline-primary" onclick="archive_email(${email.id})">Archive</button>` : ''}
            ${mailbox === 'archive' ? `<button class="btn btn-sm btn-outline-primary" onclick="unarchive_email(${email.id})">Unarchive</button>` : ''}
            <button class="btn btn-sm btn-outline-danger" onclick="delete_email(${email.id})">Delete</button>
            <hr>
            <p>${email.body.replace(/\n/g, '<br>')}</p> 
        </div>
      `;

      // Add an event listener to the row
      row.addEventListener('click', () => {

        // Mark the email as read
        row.style.fontWeight = 'normal'
        fetch(`/emails/${email.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            read: true
          })
        })

        // Show the email body
        document.querySelector('#emails-view').style.display = 'none';
        document.querySelector('#email-body').style.display = 'block';
        email_body.style.display = 'block';

      });
      // Append the email body to the email-body div
      document.getElementById('email-body').appendChild(email_body);
    });

    // Append the table to the emails-view div
    document.getElementById('emails-view').appendChild(table);
    
  })
}