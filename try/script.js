document.getElementById('metadataForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const subject = document.getElementById('subject').value.trim();
  const difficulty = document.getElementById('difficulty').value;
  const examYear = document.getElementById('examYear').value.trim();
  const note = document.getElementById('note').value.trim();

  const metadata = {
    id: Date.now(), // Simple unique ID
    subject,
    difficulty,
    examYear,
    note
  };

  // Save to localStorage
  const metadataList = JSON.parse(localStorage.getItem('metadata') || '[]');
  metadataList.push(metadata);
  localStorage.setItem('metadata', JSON.stringify(metadataList));

  // Clear form
  document.getElementById('metadataForm').reset();
  loadMetadata();
});

function loadMetadata() {
  const metadataList = JSON.parse(localStorage.getItem('metadata') || '[]');
  const list = document.getElementById('metadataList');
  list.innerHTML = '';

  metadataList.forEach(item => {
    const div = document.createElement('div');
    div.className = 'metadata-item';

    div.innerHTML = `
      <div>
        <strong>Subject:</strong> ${item.subject}<br>
        <strong>Difficulty:</strong> ${item.difficulty}<br>
        <strong>Year:</strong> ${item.examYear}<br>
        <strong>Note:</strong> ${item.note}
      </div>
      <div class="actions">
        <button onclick="editMetadata(${item.id})">Edit</button>
        <button onclick="deleteMetadata(${item.id})">Delete</button>
      </div>
    `;

    list.appendChild(div);
  });
}

function deleteMetadata(id) {
  const metadataList = JSON.parse(localStorage.getItem('metadata') || '[]');
  const filtered = metadataList.filter(item => item.id !== id);
  localStorage.setItem('metadata', JSON.stringify(filtered));
  loadMetadata();
}

function editMetadata(id) {
  const metadataList = JSON.parse(localStorage.getItem('metadata') || '[]');
  const item = metadataList.find(item => item.id === id);

  if (item) {
    document.getElementById('subject').value = item.subject;
    document.getElementById('difficulty').value = item.difficulty;
    document.getElementById('examYear').value = item.examYear;
    document.getElementById('note').value = item.note;

    // Remove the item temporarily to avoid duplication
    const filtered = metadataList.filter(item => item.id !== id);
    localStorage.setItem('metadata', JSON.stringify(filtered));
    loadMetadata();
  }
}

// Load metadata on page load
loadMetadata();
