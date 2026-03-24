public with sharing class GamifiedCasesController {

    @AuraEnabled(cacheable=true)
    public static List<CaseWrapper> getOpenCases() {
        List<CaseWrapper> caseWrappers = new List<CaseWrapper>();

        try {
            List<Case> openCases = [
                SELECT Id, CaseNumber, Subject, Priority, Status,
                       CreatedDate, Owner.Name, Description
                FROM Case
                WHERE IsClosed = false
                ORDER BY Priority, CreatedDate DESC
                LIMIT 50
            ];

            for (Case c : openCases) {
                CaseWrapper wrapper = new CaseWrapper();
                wrapper.caseId = c.Id;
                wrapper.caseNumber = c.CaseNumber;
                wrapper.subject = c.Subject != null ? c.Subject : 'No Subject';
                wrapper.priority = c.Priority != null ? c.Priority : 'Medium';
                wrapper.status = c.Status;
                wrapper.ownerName = c.Owner.Name;
                wrapper.createdDate = c.CreatedDate;
                wrapper.daysOpen = calculateDaysOpen(c.CreatedDate);
                wrapper.urgencyScore = calculateUrgencyScore(c.Priority, wrapper.daysOpen);
                caseWrappers.add(wrapper);
            }
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching cases: ' + e.getMessage());
        }

        return caseWrappers;
    }

    @AuraEnabled(cacheable=true)
    public static CaseStats getCaseStats() {
        CaseStats stats = new CaseStats();

        try {
            List<AggregateResult> results = [
                SELECT COUNT(Id) total, Priority
                FROM Case
                WHERE IsClosed = false
                GROUP BY Priority
            ];

            stats.totalOpen = 0;
            stats.highPriority = 0;
            stats.mediumPriority = 0;
            stats.lowPriority = 0;

            for (AggregateResult ar : results) {
                Integer count = (Integer)ar.get('total');
                String priority = (String)ar.get('Priority');
                stats.totalOpen += count;

                if (priority == 'High') {
                    stats.highPriority = count;
                } else if (priority == 'Medium') {
                    stats.mediumPriority = count;
                } else if (priority == 'Low') {
                    stats.lowPriority = count;
                }
            }

            // Calculate resolved today
            stats.resolvedToday = [
                SELECT COUNT()
                FROM Case
                WHERE IsClosed = true
                AND ClosedDate = TODAY
            ];

        } catch (Exception e) {
            throw new AuraHandledException('Error fetching stats: ' + e.getMessage());
        }

        return stats;
    }

    private static Integer calculateDaysOpen(DateTime createdDate) {
        if (createdDate == null) return 0;
        Long milliseconds = System.now().getTime() - createdDate.getTime();
        return (Integer)(milliseconds / (1000 * 60 * 60 * 24));
    }

    private static Integer calculateUrgencyScore(String priority, Integer daysOpen) {
        Integer score = 0;

        // Priority score
        if (priority == 'High') {
            score += 50;
        } else if (priority == 'Medium') {
            score += 30;
        } else {
            score += 10;
        }

        // Age score
        score += Math.min(daysOpen * 2, 50);

        return Math.min(score, 100);
    }

    public class CaseWrapper {
        @AuraEnabled public String caseId;
        @AuraEnabled public String caseNumber;
        @AuraEnabled public String subject;
        @AuraEnabled public String priority;
        @AuraEnabled public String status;
        @AuraEnabled public String ownerName;
        @AuraEnabled public DateTime createdDate;
        @AuraEnabled public Integer daysOpen;
        @AuraEnabled public Integer urgencyScore;
    }

    public class CaseStats {
        @AuraEnabled public Integer totalOpen;
        @AuraEnabled public Integer highPriority;
        @AuraEnabled public Integer mediumPriority;
        @AuraEnabled public Integer lowPriority;
        @AuraEnabled public Integer resolvedToday;
    }
}
