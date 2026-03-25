import { LightningElement, wire } from 'lwc';
import getOpenCases from '@salesforce/apex/GamifiedCasesController.getOpenCases';
import getCaseStats from '@salesforce/apex/GamifiedCasesController.getCaseStats';
import { refreshApex } from '@salesforce/apex';

export default class GamifiedCases extends LightningElement {
    allCases = [];
    stats;
    error;
    isLoading = true;
    wiredCasesResult;
    wiredStatsResult;

    // Pagination properties
    pageSize = 10;
    currentPage = 1;

    @wire(getOpenCases)
    wiredCases(result) {
        this.wiredCasesResult = result;
        const { data, error } = result;

        if (data) {
            this.allCases = data.map(caseItem => {
                return {
                    ...caseItem,
                    caseUrl: `/${caseItem.caseId}`,
                    priorityClass: this.getPriorityClass(caseItem.priority),
                    urgencyBarStyle: this.getUrgencyBarStyle(caseItem.urgencyScore),
                    urgencyBarClass: this.getUrgencyBarClass(caseItem.urgencyScore)
                };
            });
            this.currentPage = 1;
            this.error = undefined;
        } else if (error) {
            this.error = error.body?.message || 'Error loading cases';
            this.allCases = [];
        }
        this.isLoading = false;
    }

    @wire(getCaseStats)
    wiredStats(result) {
        this.wiredStatsResult = result;
        const { data, error } = result;

        if (data) {
            this.stats = data;
        } else if (error) {
            console.error('Error loading stats:', error);
        }
    }

    getPriorityClass(priority) {
        const priorityMap = {
            'High': 'priority-badge priority-high',
            'Medium': 'priority-badge priority-medium',
            'Low': 'priority-badge priority-low'
        };
        return priorityMap[priority] || 'priority-badge priority-medium';
    }

    getUrgencyBarStyle(score) {
        const percentage = Math.min(score, 100);
        let color;

        if (score >= 70) {
            color = '#c23934'; // Red
        } else if (score >= 40) {
            color = '#ffb75d'; // Orange
        } else {
            color = '#4bca81'; // Green
        }

        return `width: ${percentage}%; background-color: ${color};`;
    }

    getUrgencyBarClass(score) {
        if (score >= 70) return 'urgency-fill high';
        if (score >= 40) return 'urgency-fill medium';
        return 'urgency-fill low';
    }

    // Pagination computed properties
    get cases() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        return this.allCases.slice(startIndex, endIndex);
    }

    get totalPages() {
        return Math.ceil(this.allCases.length / this.pageSize);
    }

    get hasCases() {
        return !this.isLoading && this.allCases && this.allCases.length > 0;
    }

    get noCases() {
        return !this.isLoading && !this.error && (!this.allCases || this.allCases.length === 0);
    }

    get showPagination() {
        return this.hasCases && this.totalPages > 1;
    }

    get isFirstPage() {
        return this.currentPage === 1;
    }

    get isLastPage() {
        return this.currentPage === this.totalPages;
    }

    get paginationInfo() {
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, this.allCases.length);
        return `${start}-${end} of ${this.allCases.length}`;
    }

    // Pagination handlers
    handleFirstPage() {
        this.currentPage = 1;
    }

    handlePreviousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    handleNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    handleLastPage() {
        this.currentPage = this.totalPages;
    }

    handleRefresh() {
        this.isLoading = true;
        return Promise.all([
            refreshApex(this.wiredCasesResult),
            refreshApex(this.wiredStatsResult)
        ]).finally(() => {
            this.isLoading = false;
        });
    }
}