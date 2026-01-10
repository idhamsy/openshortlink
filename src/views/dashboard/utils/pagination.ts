/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

export const paginationJs = `function renderPagination(containerId, state, total, onPageChangeFunc) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const totalPages = Math.ceil(total / state.perPage);
  const currentPage = state.page;
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  const containerDiv = document.createElement('div');
  containerDiv.className = 'pagination-buttons';
  
  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'pagination-btn';
  prevBtn.textContent = 'Previous';
  prevBtn.disabled = currentPage === 1;
  if (currentPage > 1) {
    prevBtn.addEventListener('click', () => onPageChangeFunc(currentPage - 1));
  }
  containerDiv.appendChild(prevBtn);
  
  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  if (startPage > 1) {
    const firstBtn = document.createElement('button');
    firstBtn.className = 'pagination-btn';
    firstBtn.textContent = '1';
    firstBtn.addEventListener('click', () => onPageChangeFunc(1));
    containerDiv.appendChild(firstBtn);
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination-ellipsis';
      ellipsis.textContent = '...';
      containerDiv.appendChild(ellipsis);
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = 'pagination-btn' + (i === currentPage ? ' active' : '');
    pageBtn.textContent = i.toString();
    pageBtn.addEventListener('click', () => onPageChangeFunc(i));
    containerDiv.appendChild(pageBtn);
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination-ellipsis';
      ellipsis.textContent = '...';
      containerDiv.appendChild(ellipsis);
    }
    const lastBtn = document.createElement('button');
    lastBtn.className = 'pagination-btn';
    lastBtn.textContent = totalPages.toString();
    lastBtn.addEventListener('click', () => onPageChangeFunc(totalPages));
    containerDiv.appendChild(lastBtn);
  }
  
  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'pagination-btn';
  nextBtn.textContent = 'Next';
  nextBtn.disabled = currentPage === totalPages;
  if (currentPage < totalPages) {
    nextBtn.addEventListener('click', () => onPageChangeFunc(currentPage + 1));
  }
  containerDiv.appendChild(nextBtn);
  
  container.innerHTML = '';
  container.appendChild(containerDiv);
}
`;
